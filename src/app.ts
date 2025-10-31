import type { Env } from "./env";
import { ASSETS } from "./assets";
import { appHtml } from "./frontend/app-shell";
import { landingFor, requireAccessUser } from "./lib/access";
import { CORS_BASE, maybeHandlePreflight } from "./lib/cors";
import { HTML_CT, json, text, withSecurityHeaders } from "./lib/http";
import { chunk } from "./lib/utils";
import { handleHealth } from "./routes/health";
import { routeRequest } from "./router";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/") {
      return Response.redirect(url.origin + "/app", 302);
    }

    const preflight = maybeHandlePreflight(req, path);
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

    if (path === "/health") return handleHealth();

    if (path === "/app" || path === "/app/") {
      const user = await requireAccessUser(req, env);
      if (!user) {
        return withSecurityHeaders(
          new Response(appHtml(env, new URL(req.url).searchParams.get("return")), {
            headers: { "content-type": HTML_CT },
          }),
        );
      }
      return Response.redirect(env.APP_BASE_URL + landingFor(user), 302);
    }

    if (path === "/app/logout") {
      const ret = url.searchParams.get("return") || env.RETURN_DEFAULT;
      const logoutUrl = new URL(`/cdn-cgi/access/logout?return=${encodeURIComponent(ret)}`, url).toString();
      return Response.redirect(logoutUrl, 302);
    }

    if (path.startsWith("/app/")) {
      const user = await requireAccessUser(req, env);
      if (!user) {
        return withSecurityHeaders(
          new Response(appHtml(env, new URL(req.url).searchParams.get("return")), {
            headers: { "content-type": HTML_CT },
          }),
        );
      }
      return withSecurityHeaders(
        new Response(appHtml(env, new URL(req.url).searchParams.get("return")), {
          headers: { "content-type": HTML_CT },
        }),
      );
    }

    const routed = await routeRequest(req, env);
    if (routed) return routed;

    return json({ error: "Not found" }, { status: 404 });
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
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
    if (!ids.length) return;

    const ts = new Date().toISOString();
    const BATCH = 25;

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
    }
  },
};
