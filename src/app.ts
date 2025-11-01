import type { Env } from "./env";
import { ASSETS } from "./assets";
import { STATIC_BUNDLE, type StaticBundleKey } from "./frontend/static-bundle";
import { landingFor, requireAccessUser } from "./lib/access";
import { CORS_BASE, maybeHandlePreflight } from "./lib/cors";
import { HTML_CT, json, text, withSecurityHeaders } from "./utils/responses";
import { chunk } from "./utils";
import { handleRequest } from "./router";
import { systemLogger } from "./utils/logging";

const DEFAULT_APP_CONFIG = { apiBase: "", assetBase: "/assets/" };
const STATIC_CONTENT_TYPES: Record<string, string> = {
  ".html": HTML_CT,
  ".js": "application/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
};
const APP_R2_PREFIX = "app/";

function extname(path: string): string {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? "" : path.slice(idx);
}

function contentTypeFor(path: string): string {
  return STATIC_CONTENT_TYPES[extname(path)] || "application/octet-stream";
}

type StaticAssetResponse = {
  response: Response;
  scriptHashes?: string[];
};

const JSON_HTML_SAFE_CHARS = /[<>&\u2028\u2029]/g;
const JSON_HTML_SAFE_REPLACEMENTS: Record<string, string> = {
  "<": "\\u003C",
  ">": "\\u003E",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

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

export function resolveAppConfig(env: Env) {
  return {
    apiBase: env.APP_API_BASE ?? DEFAULT_APP_CONFIG.apiBase,
    assetBase: env.APP_ASSET_BASE ?? DEFAULT_APP_CONFIG.assetBase,
    returnDefault: env.RETURN_DEFAULT,
  };
}

export function serializeAppConfig(config: ReturnType<typeof resolveAppConfig>) {
  const json = JSON.stringify(config);
  return json.replace(JSON_HTML_SAFE_CHARS, (char) => JSON_HTML_SAFE_REPLACEMENTS[char] ?? char);
}

async function injectAppConfig(html: string, env: Env): Promise<{ html: string; scriptHashes: string[] }> {
  const config = resolveAppConfig(env);
  const scriptContent = `window.__APP_CONFIG__=${serializeAppConfig(config)};`;
  const hash = await sha256Base64(scriptContent);
  const scriptToken = `'sha256-${hash}'`;
  const scriptTag = `<script>${scriptContent}</script>`;
  const closingHead = /<\/head>/i;
  const injected =
    closingHead.test(html) ?
      html.replace(closingHead, `  ${scriptTag}\n</head>`) :
      `${scriptTag}\n${html}`;
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
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/") {
      return Response.redirect(url.origin + "/app", 302);
    }

    const preflight = maybeHandlePreflight(req, path, env);
    if (preflight) return preflight;

    if (path === "/favicon.ico") {
      return withSecurityHeaders(new Response("", { status: 204 }));
    }

    if (path === "/sw-brand.js") {
      return withSecurityHeaders(
        new Response("// stub\n", { headers: { "content-type": "application/javascript" } }),
      );
    }

    if (req.method === "OPTIONS") {
      return withSecurityHeaders(new Response("", { status: 204, headers: CORS_BASE }));
    }

    if (path.startsWith("/assets/")) {
      const name = decodeURIComponent(path.replace("/assets/", ""));
      const asset = ASSETS[name];
      if (!asset) return text("Not found", { status: 404 });
      return withSecurityHeaders(new Response(asset.body, { headers: { "content-type": asset.ct } }));
    }

    if (path === "/app" || path === "/app/") {
      const user = await requireAccessUser(req, env);
      if (user) {
        const landing = env.APP_BASE_URL + landingFor(user);
        if (url.pathname !== landing) {
          return Response.redirect(landing, 302);
        }
      }
      const spa = await serveAppStatic("/app", env);
      if (spa) {
        return withSecurityHeaders(
          spa.response,
          spa.scriptHashes ? { scriptHashes: spa.scriptHashes } : undefined,
        );
      }
      return text("Not found", { status: 404 });
    }

    if (path === "/app/logout") {
      const ret = url.searchParams.get("return") || env.RETURN_DEFAULT;
      const logoutUrl = new URL(`/cdn-cgi/access/logout?return=${encodeURIComponent(ret)}`, url).toString();
      return Response.redirect(logoutUrl, 302);
    }

    if (path.startsWith("/app/assets/")) {
      const assetRes = await serveAppStatic(path, env);
      if (assetRes) {
        return withSecurityHeaders(
          assetRes.response,
          assetRes.scriptHashes ? { scriptHashes: assetRes.scriptHashes } : undefined,
        );
      }
      return text("Not found", { status: 404 });
    }

    if (path.startsWith("/app/")) {
      await requireAccessUser(req, env);
      const spa = await serveAppStatic(path, env);
      if (spa) {
        return withSecurityHeaders(
          spa.response,
          spa.scriptHashes ? { scriptHashes: spa.scriptHashes } : undefined,
        );
      }
      return text("Not found", { status: 404 });
    }

    return handleRequest(req, env);
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const log = systemLogger({ task: "offline-cron" });
    const hbInterval = Number(env.HEARTBEAT_INTERVAL_SECS ?? "30");
    const multiplier = Number(env.OFFLINE_MULTIPLIER ?? "6");
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
    const BATCH = 25;

    let processed = 0;
    for (const batchIds of chunk(ids, BATCH)) {
      const phA = batchIds.map((_, i) => `?${i + 1}`).join(",");
      await env.DB.prepare(`UPDATE devices SET online=0 WHERE online=1 AND device_id IN (${phA})`)
        .bind(...batchIds)
        .run();

      const phB = batchIds.map((_, i) => `?${i + 2}`).join(",");
      await env.DB.prepare(`UPDATE latest_state SET online=0, updated_at=?1 WHERE device_id IN (${phB})`)
        .bind(ts, ...batchIds)
        .run();

      const values = batchIds.map(() => `(?, ?, ?, ?, ?)`).join(",");
      const binds: any[] = [];
      for (const id of batchIds) binds.push(ts, "/cron/offline", 200, 0, id);
      await env.DB.prepare(
        `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES ${values}`,
      )
        .bind(...binds)
        .run();

      processed += batchIds.length;
    }

    log.info("cron.offline_check.completed", {
      stale_count: ids.length,
      processed,
      batches: Math.ceil(ids.length / BATCH),
    });
  },
};
