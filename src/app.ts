import { validateEnv, type Env } from "./env";
import { ASSETS } from "./assets";
import { STATIC_BUNDLE, type StaticBundleKey } from "./frontend/static-bundle";
import { landingFor, requireAccessUser } from "./lib/access";
import { clearSessionCookie } from "./lib/auth/sessions";
import { CORS_BASE, maybeHandlePreflight } from "./lib/cors";
import { HTML_CT, text, withSecurityHeaders, type SecurityHeaderOptions } from "./utils/responses";
import { handleRequest } from "./router";
import { systemLogger } from "./utils/logging";
import { resolveAppConfig, serializeAppConfig } from "./app-config";
import { baseSecurityHeaderOptions, mergeSecurityHeaderOptions } from "./utils/security-options";
import { expandAssetBase } from "./utils/asset-base";
import { resolveLogoutReturn } from "./utils/return-url";
import { handleR2Request } from "./r2";
import { runTelemetryRetention, TELEMETRY_RETENTION_CRON } from "./jobs/retention";
import { clearCronCursor, readCronCursor, writeCronCursor } from "./lib/cron-cursor";
import { recordOpsMetric } from "./lib/ops-metrics";
import { loadSignupFunnelSummary } from "./lib/signup-funnel";
import { ALERT_THRESHOLDS } from "./telemetry";
export { resolveAppConfig, serializeAppConfig } from "./app-config";

const STATIC_CONTENT_TYPES: Record<string, string> = {
  ".html": HTML_CT,
  ".js": "application/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
};
const APP_R2_PREFIX = "app/";
const DEFAULT_HEARTBEAT_INTERVAL_SECS = 30;
const DEFAULT_OFFLINE_MULTIPLIER = 6;
const OFFLINE_BATCH_SIZE = 100;
const OFFLINE_MAX_BATCHES_PER_RUN = 40;
const OFFLINE_CURSOR_KEY = "offline.devices";
const SIGNUP_FUNNEL_ALERT_CRON = "*/10 * * * *";

function extname(path: string): string {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? "" : path.slice(idx);
}

function contentTypeFor(path: string): string {
  return STATIC_CONTENT_TYPES[extname(path)] || "application/octet-stream";
}

function coerceFiniteNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type StaticAssetResponse = {
  response: Response;
  scriptHashes?: string[];
};

function rewriteStaticAssetBase(html: string, assetBase: string) {
  if (!assetBase) return html;
  return html.replace(/(href|src)=(["'])\/(?:app\/)?assets\/([^"']+)/g, (_match, attr, quote, suffix) => {
    const rewritten = expandAssetBase(assetBase, suffix);
    return `${attr}=${quote}${rewritten}`;
  });
}

function defaultCacheControl(key: StaticBundleKey) {
  if (key === "index.html") return "no-store";
  if (key.startsWith("assets/")) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=900, immutable";
}

async function sha256Base64(content: string) {
  const data = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function injectAppConfig(html: string, env: Env): Promise<{ html: string; scriptHashes: string[] }> {
  const config = resolveAppConfig(env);
  const rewrittenHtml = rewriteStaticAssetBase(html, config.assetBase);
  const scriptContent = `window.__APP_CONFIG__=${serializeAppConfig(config)};`;
  const hash = await sha256Base64(scriptContent);
  const scriptToken = `'sha256-${hash}'`;
  const scriptTag = `<script>${scriptContent}</script>`;
  const closingHead = /<\/head>/i;
  const injected =
    closingHead.test(rewrittenHtml) ?
      rewrittenHtml.replace(closingHead, `  ${scriptTag}\n</head>`) :
      `${scriptTag}\n${rewrittenHtml}`;
  return { html: injected, scriptHashes: [scriptToken] };
}

async function loadFromR2(key: string, env: Env) {
  if (!("APP_STATIC" in env) || !env.APP_STATIC) return null;
  return env.APP_STATIC.get(APP_R2_PREFIX + key);
}

function r2Headers(obj: any, fallbackCt: string, key: StaticBundleKey) {
  const headers = new Headers();
  if (obj?.httpMetadata?.contentType) {
    headers.set("content-type", obj.httpMetadata.contentType);
  } else {
    headers.set("content-type", fallbackCt);
  }
  if (obj?.httpMetadata?.cacheControl) {
    headers.set("cache-control", obj.httpMetadata.cacheControl);
  }
  if (!headers.has("cache-control")) {
    headers.set("cache-control", defaultCacheControl(key));
  }
  return headers;
}

async function bundleResponse(key: StaticBundleKey, env: Env): Promise<StaticAssetResponse> {
  const body = STATIC_BUNDLE[key] as string;
  const ct = contentTypeFor(key);
  let payload = body;
  let scriptHashes: string[] | undefined;
  if (key === "index.html") {
    const injected = await injectAppConfig(body, env);
    payload = injected.html;
    scriptHashes = injected.scriptHashes;
  }
  const headers = new Headers({
    "content-type": ct,
    "cache-control": defaultCacheControl(key),
  });
  return { response: new Response(payload, { headers }), scriptHashes };
}

async function readR2Text(obj: any) {
  if (obj && typeof obj.text === "function") {
    return obj.text();
  }
  return new Response(obj?.body).text();
}

async function serveAppStatic(path: string, env: Env): Promise<StaticAssetResponse | null> {
  const normalized = path.replace(/^\/app\/?/, "");
  const bundleKey = (normalized && !normalized.startsWith("assets/") ? "index.html" : normalized || "index.html") as StaticBundleKey;
  if (!(bundleKey in STATIC_BUNDLE)) {
    return null;
  }
  const ctHint = contentTypeFor(bundleKey);
  const r2 = await loadFromR2(bundleKey, env);
  if (r2) {
    const headers = r2Headers(r2, ctHint, bundleKey);
    if (bundleKey === "index.html") {
      const raw = await readR2Text(r2);
      const injected = await injectAppConfig(raw, env);
      return {
        response: new Response(injected.html, { headers }),
        scriptHashes: injected.scriptHashes,
      };
    }
    return { response: new Response(r2.body, { headers }) };
  }
  return bundleResponse(bundleKey, env);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    validateEnv(env);
    const url = new URL(req.url);
    const path = url.pathname;
    const baseSecurity = baseSecurityHeaderOptions(env);
    const applySecurity = (response: Response, overrides?: SecurityHeaderOptions) =>
      withSecurityHeaders(response, mergeSecurityHeaderOptions(baseSecurity, overrides));
    const canonicalAppRequestUrl = (requestUrl: URL): URL => {
      try {
        const canonical = new URL(env.APP_BASE_URL);
        canonical.pathname = requestUrl.pathname;
        canonical.search = requestUrl.search;
        canonical.hash = requestUrl.hash;
        return canonical;
      } catch {
        return requestUrl;
      }
    };
    const respondUnauthenticated = () => {
      const clearCookie = clearSessionCookie(env);
      const attachCookie = (response: Response) => {
        const headers = new Headers(response.headers);
        headers.set("Set-Cookie", clearCookie);
        return new Response(response.body, {
          headers,
          status: response.status,
          statusText: response.statusText,
        });
      };
      if (req.method === "GET" || req.method === "HEAD") {
        try {
          const canonicalUrl = canonicalAppRequestUrl(url);
          const loginUrl = new URL(
            `/cdn-cgi/access/login/${encodeURIComponent(env.ACCESS_AUD)}`,
            canonicalUrl,
          );
          loginUrl.searchParams.set("redirect_url", canonicalUrl.toString());
          const redirect = Response.redirect(loginUrl.toString(), 302);
          return applySecurity(attachCookie(redirect));
        } catch {
          // fall back to 401 below
        }
      }
      const unauthorized = new Response("Unauthorized", { status: 401 });
      return applySecurity(attachCookie(unauthorized));
    };

    if (path === "/") {
      return Response.redirect(url.origin + "/app", 302);
    }

    const preflight = maybeHandlePreflight(req, path, env);
    if (preflight) return applySecurity(preflight);

    if (path === "/favicon.ico") {
      return applySecurity(new Response("", { status: 204 }));
    }

    if (path === "/sw-brand.js") {
      return applySecurity(
        new Response("// stub\n", { headers: { "content-type": "application/javascript" } }),
      );
    }

    if (path === "/r2" || path.startsWith("/r2/")) {
      return handleR2Request(req, env, { routePrefix: "/r2" });
    }

    if (req.method === "OPTIONS") {
      return applySecurity(new Response("", { status: 204, headers: CORS_BASE }));
    }

    if (path.startsWith("/assets/")) {
      const name = decodeURIComponent(path.replace("/assets/", ""));
      const asset = ASSETS[name];
      if (!asset) return text("Not found", { status: 404 });
      return applySecurity(new Response(asset.body, { headers: { "content-type": asset.ct } }));
    }

    if (path === "/app" || path === "/app/") {
      const user = await requireAccessUser(req, env);
      if (!user) {
        return respondUnauthenticated();
      }
      const landingPath = landingFor(user);
      if (!landingPath.startsWith("/") || landingPath.startsWith("//")) {
        throw new Error(`Invalid landing path: ${landingPath}`);
      }
      const landingUrl = new URL(landingPath, env.APP_BASE_URL);
      if (url.pathname !== landingUrl.pathname) {
        return applySecurity(Response.redirect(landingUrl.toString(), 302));
      }
      const spa = await serveAppStatic("/app", env);
      if (spa) {
        const overrides = spa.scriptHashes ? { scriptHashes: spa.scriptHashes } : undefined;
        return applySecurity(spa.response, overrides);
      }
      return text("Not found", { status: 404 });
    }

    if (path === "/app/logout") {
      const ret = resolveLogoutReturn(url.searchParams.get("return"), env, url);
      const logoutUrl = new URL("/cdn-cgi/access/logout", url);
      logoutUrl.searchParams.set("return", ret);
      const redirect = Response.redirect(logoutUrl.toString(), 302);
      redirect.headers.set("Set-Cookie", clearSessionCookie(env));
      return redirect;
    }

    if (path.startsWith("/app/assets/")) {
      const user = await requireAccessUser(req, env);
      if (!user) {
        return respondUnauthenticated();
      }
      const assetRes = await serveAppStatic(path, env);
      if (assetRes) {
        const overrides = assetRes.scriptHashes ? { scriptHashes: assetRes.scriptHashes } : undefined;
        return applySecurity(assetRes.response, overrides);
      }
      return text("Not found", { status: 404 });
    }

    if (path.startsWith("/app/")) {
      const user = await requireAccessUser(req, env);
      if (!user) {
        return respondUnauthenticated();
      }
      const spa = await serveAppStatic(path, env);
      if (spa) {
        const overrides = spa.scriptHashes ? { scriptHashes: spa.scriptHashes } : undefined;
        return applySecurity(spa.response, overrides);
      }
      return text("Not found", { status: 404 });
    }

    return handleRequest(req, env);
  },

  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    if (event.cron === TELEMETRY_RETENTION_CRON) {
      const retentionLog = systemLogger({ task: "retention-cron" });
      try {
        await runTelemetryRetention(env, { logger: retentionLog });
      } catch (error) {
        retentionLog.error("cron.retention.failed", { error });
      }
      return;
    }

    if (event.cron === SIGNUP_FUNNEL_ALERT_CRON) {
      await runSignupFunnelMonitor(env);
      return;
    }

    const log = systemLogger({ task: "offline-cron" });
    try {
      const result = await env.DB.prepare(
        `DELETE FROM ingest_nonces WHERE expires_at < ?1`,
      )
        .bind(Date.now())
        .run();
      log.debug("cron.ingest_nonce_prune.completed", {
        deleted: result.meta?.changes ?? 0,
      });
    } catch (error) {
      log.error("cron.ingest_nonce_prune.failed", { error });
    }

    const hbInterval = coerceFiniteNumber(
      env.HEARTBEAT_INTERVAL_SECS,
      DEFAULT_HEARTBEAT_INTERVAL_SECS,
    );
    const multiplier = coerceFiniteNumber(env.OFFLINE_MULTIPLIER, DEFAULT_OFFLINE_MULTIPLIER);
    const thresholdSecs = Math.max(60, hbInterval * multiplier);
    const days = thresholdSecs / 86400;

    const offlineStartedAt = Date.now();

    const totalRow = await env.DB
      .prepare(
        `SELECT COUNT(*) AS cnt
           FROM devices
          WHERE online = 1
            AND (last_seen_at IS NULL OR (julianday('now') - julianday(last_seen_at)) > ?1)`,
      )
      .bind(days)
      .first<{ cnt: number | string | null }>();
    const totalStale = Number(totalRow?.cnt ?? 0);

    if (!Number.isFinite(totalStale) || totalStale <= 0) {
      await clearCronCursor(env, OFFLINE_CURSOR_KEY);
      log.debug("cron.offline_check.noop", { stale_count: 0, threshold_secs: thresholdSecs });
      await recordOpsMetric(env, "/cron/offline", 200, Date.now() - offlineStartedAt, null, log);
      return;
    }

    log.info("cron.offline_check.start", {
      stale_count: totalStale,
      threshold_secs: thresholdSecs,
    });

    const ts = new Date().toISOString();
    const existingCursorRaw = await readCronCursor(env, OFFLINE_CURSOR_KEY);
    let cursor = existingCursorRaw ? Number(existingCursorRaw) : 0;
    let resumeCursor: number | null = existingCursorRaw ? Number(existingCursorRaw) : null;
    let processed = 0;
    let batches = 0;
    let truncated = false;

    while (true) {
      const rowsResult = await env.DB
        .prepare(
          `SELECT rowid, device_id
             FROM devices
            WHERE online = 1
              AND (last_seen_at IS NULL OR (julianday('now') - julianday(last_seen_at)) > ?1)
              AND rowid > ?2
            ORDER BY rowid
            LIMIT ?3`,
        )
        .bind(days, cursor, OFFLINE_BATCH_SIZE)
        .all<{ rowid: number; device_id: string }>();

      const rows = rowsResult.results ?? [];
      if (!rows.length) {
        resumeCursor = null;
        break;
      }

      const batchIds = rows.map((row) => row.device_id);
      batches += 1;

      const devicePlaceholders = batchIds.map(() => "?").join(",");
      await env.DB.prepare(
        `UPDATE devices SET online=0 WHERE online=1 AND device_id IN (${devicePlaceholders})`,
      )
        .bind(...batchIds)
        .run();

      const latestPlaceholders = batchIds.map((_, index) => `?${index + 2}`).join(",");
      await env.DB.prepare(
        `UPDATE latest_state SET online=0, updated_at=?1 WHERE device_id IN (${latestPlaceholders})`,
      )
        .bind(ts, ...batchIds)
        .run();

      const values = batchIds.map(() => `(?, ?, ?, ?, ?)`).join(",");
      const binds: any[] = [];
      for (const id of batchIds) {
        binds.push(ts, "/cron/offline", 200, 0, id);
      }
      await env.DB.prepare(
        `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES ${values}`,
      )
        .bind(...binds)
        .run();

      processed += batchIds.length;
      const lastRowId = rows[rows.length - 1]?.rowid ?? cursor;
      cursor = lastRowId;
      resumeCursor = lastRowId;

      if (batches >= OFFLINE_MAX_BATCHES_PER_RUN) {
        truncated = true;
        break;
      }

      if (rows.length < OFFLINE_BATCH_SIZE) {
        resumeCursor = null;
        break;
      }
    }

    if (resumeCursor !== null) {
      await writeCronCursor(env, OFFLINE_CURSOR_KEY, resumeCursor);
    } else {
      await clearCronCursor(env, OFFLINE_CURSOR_KEY);
    }

    log.info("cron.offline_check.completed", {
      stale_count: totalStale,
      processed,
      batches,
      truncated,
      resume_cursor: resumeCursor,
    });

    await recordOpsMetric(env, "/cron/offline", truncated ? 299 : 200, Date.now() - offlineStartedAt, null, log);
  },
};

async function runSignupFunnelMonitor(env: Env): Promise<void> {
  const startedAt = Date.now();
  const log = systemLogger({ task: "signup-funnel-cron" });
  try {
    const summary = await loadSignupFunnelSummary(env);
    const thresholds = ALERT_THRESHOLDS.signup;
    const conversionSeverity = deriveInvertedSeverity(
      summary.conversion_rate,
      thresholds.conversion_rate,
    );
    const pendingSeverity = deriveSeverity(summary.pending_ratio, thresholds.pending_ratio);
    const errorSeverity = deriveSeverity(summary.error_rate, thresholds.error_rate);
    const overallSeverity = worstSeverity(conversionSeverity, worstSeverity(pendingSeverity, errorSeverity));

    log.info("signup.funnel.check", {
      status: overallSeverity,
      submissions: summary.submissions,
      authenticated: summary.authenticated,
      pending: summary.pending,
      errors: summary.errors,
      conversion_rate: summary.conversion_rate,
      pending_ratio: summary.pending_ratio,
      error_rate: summary.error_rate,
      window_start: summary.window_start,
      window_days: summary.window_days,
    });

    if (overallSeverity !== "ok") {
      log.warn("signup.funnel_degraded", {
        status: overallSeverity,
        conversion_rate: summary.conversion_rate,
        pending_ratio: summary.pending_ratio,
        error_rate: summary.error_rate,
        metric: "greenbro.signup.funnel_degraded",
        metric_key: "signup.funnel_degraded",
        count: 1,
      });
    }

    const statusCode = severityToStatusCode(overallSeverity);
    await recordOpsMetric(env, "/cron/signup-funnel", statusCode, Date.now() - startedAt, null, log);
  } catch (error) {
    log.error("signup.funnel.failed", { error });
    await recordOpsMetric(env, "/cron/signup-funnel", 500, Date.now() - startedAt, null, log);
  }
}

type SeverityLevel = "ok" | "warn" | "critical";

function deriveSeverity(
  value: number,
  thresholds: { warn: number; critical: number },
): SeverityLevel {
  if (value >= thresholds.critical) return "critical";
  if (value >= thresholds.warn) return "warn";
  return "ok";
}

function deriveInvertedSeverity(
  value: number,
  thresholds: { warn: number; critical: number },
): SeverityLevel {
  if (value <= thresholds.critical) return "critical";
  if (value <= thresholds.warn) return "warn";
  return "ok";
}

function worstSeverity(a: SeverityLevel, b: SeverityLevel): SeverityLevel {
  return severityWeight(a) >= severityWeight(b) ? a : b;
}

function severityWeight(level: SeverityLevel): number {
  switch (level) {
    case "critical":
      return 3;
    case "warn":
      return 2;
    default:
      return 1;
  }
}

function severityToStatusCode(level: SeverityLevel): number {
  if (level === "critical") return 500;
  if (level === "warn") return 299;
  return 200;
}
