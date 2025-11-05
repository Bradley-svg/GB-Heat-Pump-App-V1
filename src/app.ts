import { validateEnv, type Env } from "./env";
import { ASSETS } from "./assets";
import { STATIC_BUNDLE, type StaticBundleKey } from "./frontend/static-bundle";
import { landingFor, requireAccessUser } from "./lib/access";
import { CORS_BASE, maybeHandlePreflight } from "./lib/cors";
import {
  HTML_CT,
  json,
  text,
  withSecurityHeaders,
  type SecurityHeaderOptions,
} from "./utils/responses";
import { chunk } from "./utils";
import { handleRequest } from "./router";
import { systemLogger } from "./utils/logging";
import { resolveAppConfig, serializeAppConfig } from "./app-config";
import { baseSecurityHeaderOptions, mergeSecurityHeaderOptions } from "./utils/security-options";
import { expandAssetBase } from "./utils/asset-base";
import { resolveLogoutReturn } from "./utils/return-url";
import { handleR2Request } from "./r2";
import { runTelemetryRetention, TELEMETRY_RETENTION_CRON } from "./jobs/retention";
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
      if (req.method === "GET" || req.method === "HEAD") {
        try {
          const canonicalUrl = canonicalAppRequestUrl(url);
          const loginUrl = new URL(
            `/cdn-cgi/access/login/${encodeURIComponent(env.ACCESS_AUD)}`,
            canonicalUrl,
          );
          loginUrl.searchParams.set("redirect_url", canonicalUrl.toString());
          return applySecurity(Response.redirect(loginUrl.toString(), 302));
        } catch {
          // fall back to 401 below
        }
      }
      return applySecurity(new Response("Unauthorized", { status: 401 }));
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
      return Response.redirect(logoutUrl.toString(), 302);
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

    const stale = await env.DB.prepare(
      `SELECT device_id FROM devices
        WHERE online = 1
          AND (last_seen_at IS NULL OR (julianday('now') - julianday(last_seen_at)) > ?1)`,
    )
      .bind(days)
      .all<{ device_id: string }>();

    const ids = stale.results?.map((r) => r.device_id) ?? [];
    if (!ids.length) {
      log.debug("cron.offline_check.noop", { stale_count: 0, threshold_secs: thresholdSecs });
      return;
    }

    log.info("cron.offline_check.start", {
      stale_count: ids.length,
      threshold_secs: thresholdSecs,
    });

    const ts = new Date().toISOString();
    let processed = 0;
    let batches = 0;
    let truncated = false;

    for (const batchIds of chunk(ids, OFFLINE_BATCH_SIZE)) {
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
      if (batches >= OFFLINE_MAX_BATCHES_PER_RUN) {
        truncated = true;
        break;
      }
    }

    log.info("cron.offline_check.completed", {
      stale_count: ids.length,
      processed,
      batches,
      truncated,
    });
  },
};
