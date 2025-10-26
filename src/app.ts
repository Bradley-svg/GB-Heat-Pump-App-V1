/* GB Heat Pump App V1 — Cloudflare Worker */

import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env, TelemetryBody, HeartbeatBody } from "./types";
import { deriveUserFromClaims, landingFor } from "./rbac";

// ---------- small helpers ----------

const JSON_CT = "application/json;charset=utf-8";
const HTML_CT = "text/html;charset=utf-8";
const SVG_CT = "image/svg+xml;charset=utf-8";

function json(data: unknown, init: ResponseInit = {}) {
  return withSecurityHeaders(
    new Response(JSON.stringify(data), {
      headers: { "content-type": JSON_CT },
      ...init,
    }),
  );
}
function text(s: string, init: ResponseInit = {}) {
  return withSecurityHeaders(new Response(s, init));
}

function withSecurityHeaders(res: Response) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://unpkg.com 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const h = new Headers(res.headers);
  h.set("Content-Security-Policy", csp);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "no-referrer");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  return new Response(res.body, {
    headers: h,
    status: res.status,
    statusText: res.statusText,
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function round(n: number | undefined, dp: number): number | null {
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

function nowISO() {
  return new Date().toISOString();
}

function maskId(id: string) {
  if (!id) return "";
  if (id.length <= 4) return "****";
  return id.slice(0, 3) + "…" + id.slice(-2);
}

// ---------- Cloudflare Access (JWT) ----------

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function getJwks(env: Env) {
  if (!jwksCache.has(env.ACCESS_JWKS_URL)) {
    jwksCache.set(
      env.ACCESS_JWKS_URL,
      createRemoteJWKSet(new URL(env.ACCESS_JWKS_URL)),
    );
  }
  return jwksCache.get(env.ACCESS_JWKS_URL)!;
}

async function requireAccessUser(req: Request, env: Env) {
  const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, getJwks(env), {
      audience: env.ACCESS_AUD,
    });
    return deriveUserFromClaims(payload as any);
  } catch (_e) {
    return null;
  }
}

// ---------- Static assets (inline SVGs) ----------

const ASSETS: Record<string, { ct: string; body: string }> = {
  "GREENBRO LOGO APP.svg": {
    ct: SVG_CT,
    body:
      `<svg viewBox="0 0 320 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GreenBro"><rect width="320" height="64" rx="12" fill="#0b1e14"/><text x="32" y="40" font-size="28" font-family="Arial, Helvetica, sans-serif" fill="#52ff99">GreenBro</text></svg>`,
  },
  "Gear_Icon_01.svg": {
    ct: SVG_CT,
    body:
      `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" fill="#52ff99"/><path d="M3 12h3m12 0h3M12 3v3m0 12v3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9 5 19" stroke="#52ff99" stroke-width="2" fill="none"/></svg>`,
  },
  "Gear_Icon_02.svg": {
    ct: SVG_CT,
    body:
      `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="12" height="12" rx="2" stroke="#52ff99" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="2" fill="#52ff99"/></svg>`,
  },
  "Gear_Icon_03.svg": {
    ct: SVG_CT,
    body:
      `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 12a8 8 0 1 0 16 0" stroke="#52ff99" stroke-width="2" fill="none"/><path d="M12 4a8 8 0 0 0 0 16" stroke="#52ff99" stroke-width="2" fill="none"/></svg>`,
  },
};

// ---------- API handlers ----------

async function handleHealth() {
  return json({ ok: true, ts: nowISO() });
}

async function handleMe(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return json(user);
}

async function handleLatest(_req: Request, env: Env, deviceId: string) {
  const row = await env.DB.prepare(
    `SELECT * FROM latest_state WHERE device_id = ?1`,
  )
    .bind(deviceId)
    .first<any>();

  if (!row) return json({ error: "Not found" }, { status: 404 });

  // In a real app we'd check calling user's roles against device ownership
  return json({ device_id: deviceId, latest: row });
}

// Device-key auth: hash provided key and compare to stored devices.device_key_hash
async function verifyDeviceKey(
  env: Env,
  deviceId: string,
  keyHeader: string | null,
) {
  if (!keyHeader) return false;
  const row = await env.DB.prepare(
    `SELECT device_key_hash FROM devices WHERE device_id = ?1`,
  )
    .bind(deviceId)
    .first<any>();
  if (!row || !row.device_key_hash) return false;
  const hash = await sha256Hex(keyHeader);
  return hash.toLowerCase() === String(row.device_key_hash).toLowerCase();
}

async function handleIngest(req: Request, env: Env, profileId: string) {
  const t0 = Date.now();

  // ---- PATCH A: use req.json() (faster + BOM-safe) ----
  let body: TelemetryBody;
  try {
    body = await req.json<TelemetryBody>();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Optional size guard (stringified length)
  if (JSON.stringify(body).length > 256_000) {
    return json({ error: "Payload too large" }, { status: 413 });
  }

  if (!body?.device_id || !body?.ts || !body?.metrics) {
    return json({ error: "Missing required fields" }, { status: 400 });
  }

  const ok = await verifyDeviceKey(
    env,
    body.device_id,
    req.headers.get("X-GREENBRO-DEVICE-KEY"),
  );
  if (!ok) return json({ error: "Unauthorized" }, { status: 401 });

  // Derive metrics
  const supply = body.metrics.supplyC ?? null;
  const ret = body.metrics.returnC ?? null;
  const deltaT =
    typeof supply === "number" && typeof ret === "number"
      ? round(supply - ret, 1)
      : null;
  const flow = body.metrics.flowLps ?? 0;
  const rho = 0.997; // kg/L at 20°C
  const cp = 4.186; // kJ/kg·°C
  const thermalKW = deltaT !== null ? round(rho * cp * flow * deltaT, 2) : null;

  let cop: number | null = null;
  let cop_quality: "measured" | "estimated" | null = null;

  if (typeof body.metrics.powerKW === "number" && body.metrics.powerKW > 0.05 && thermalKW !== null) {
    cop = round(thermalKW / body.metrics.powerKW, 2);
    cop_quality = "measured";
  } else if (thermalKW !== null) {
    cop = null;
    cop_quality = "estimated";
  }

  const tsMs = Date.parse(body.ts);
  const faults_json = JSON.stringify(body.faults || []);
  const status_json = JSON.stringify({
    mode: body.metrics.mode ?? null,
    defrost: body.metrics.defrost ?? 0,
    rssi: body.rssi ?? null,
  });

  // Persist
  try {
    const tx = env.DB.batch([
      env.DB.prepare(
        `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT (device_id, ts) DO NOTHING`,
      ).bind(
        body.device_id,
        tsMs,
        JSON.stringify(body.metrics),
        deltaT,
        thermalKW,
        cop,
        cop_quality,
        status_json,
        faults_json,
      ),
      env.DB.prepare(
        `INSERT INTO latest_state
           (device_id, ts, supplyC, returnC, tankC, ambientC, flowLps, compCurrentA, eevSteps, powerKW,
            deltaT, thermalKW, cop, cop_quality, mode, defrost, online, faults_json, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,1,?17,?18)
         ON CONFLICT(device_id) DO UPDATE SET
            ts=excluded.ts, supplyC=excluded.supplyC, returnC=excluded.returnC, tankC=excluded.tankC,
            ambientC=excluded.ambientC, flowLps=excluded.flowLps, compCurrentA=excluded.compCurrentA,
            eevSteps=excluded.eevSteps, powerKW=excluded.powerKW, deltaT=excluded.deltaT,
            thermalKW=excluded.thermalKW, cop=excluded.cop, cop_quality=excluded.cop_quality,
            mode=excluded.mode, defrost=excluded.defrost, online=1, faults_json=excluded.faults_json,
            updated_at=excluded.updated_at`,
      ).bind(
        body.device_id,
        tsMs,
        supply,
        ret,
        body.metrics.tankC ?? null,
        body.metrics.ambientC ?? null,
        flow,
        body.metrics.compCurrentA ?? null,
        body.metrics.eevSteps ?? null,
        body.metrics.powerKW ?? null,
        deltaT,
        thermalKW,
        cop,
        cop_quality,
        body.metrics.mode ?? null,
        body.metrics.defrost ?? 0,
        faults_json,
        nowISO(),
      ),
      env.DB.prepare(
        `INSERT INTO devices (device_id, profile_id, online, last_seen_at, device_key_hash)
         VALUES (?1, ?2, 1, ?3, COALESCE((SELECT device_key_hash FROM devices WHERE device_id = ?1), ''))
         ON CONFLICT(device_id) DO UPDATE SET online=1, last_seen_at=excluded.last_seen_at`,
      ).bind(body.device_id, profileId, body.ts),
    ]);
    await tx;

    const dur = Date.now() - t0;
    await env.DB.prepare(
      `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
      .bind(nowISO(), "/api/ingest", 200, dur, body.device_id)
      .run();

    return json({ ok: true });
  } catch (e: any) {
    const dur = Date.now() - t0;
    await env.DB.prepare(
      `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
      .bind(nowISO(), "/api/ingest", 500, dur, body.device_id)
      .run();
    return json(
      { error: "DB error", detail: String(e?.message || e) },
      { status: 500 },
    );
  }
}

async function handleHeartbeat(req: Request, env: Env, profileId: string) {
  let body: HeartbeatBody;
  try {
    body = await req.json<HeartbeatBody>();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.device_id || !body?.ts) return json({ error: "Missing fields" }, { status: 400 });

  const ok = await verifyDeviceKey(
    env,
    body.device_id,
    req.headers.get("X-GREENBRO-DEVICE-KEY"),
  );
  if (!ok) return json({ error: "Unauthorized" }, { status: 401 });

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO devices (device_id, profile_id, online, last_seen_at, device_key_hash)
       VALUES (?1, ?2, 1, ?3, COALESCE((SELECT device_key_hash FROM devices WHERE device_id = ?1), ''))
       ON CONFLICT(device_id) DO UPDATE SET online=1, last_seen_at=excluded.last_seen_at`,
    ).bind(body.device_id, profileId, body.ts),
    env.DB.prepare(
      `UPDATE latest_state SET online=1, updated_at=?2 WHERE device_id=?1`,
    ).bind(body.device_id, nowISO()),
  ]);

  return json({ ok: true });
}

// ---------- SPA (inline) ----------
// (omitted here for brevity—same as your current version)

function appHtml(env: Env, returnUrlParam: string | null) {
  // ... keep your existing appHtml implementation ...
  // (no functional changes needed for this bug)
  return `<!doctype html>...`; // your existing HTML
}

// ---------- Router ----------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // Redirect root -> /app with ABSOLUTE URL (fixes dashboard preview)
    if (path === "/") {
      const dest = new URL("/app", req.url).toString();
      return Response.redirect(dest, 302);
    }

    if (path === "/favicon.ico")
      return withSecurityHeaders(new Response("", { status: 204 }));

    if (path === "/sw-brand.js") {
      return withSecurityHeaders(
        new Response("// stub\n", {
          headers: { "content-type": "application/javascript" },
        }),
      );
    }

    // ---- PATCH B: CORS/preflight allow device header ----
    if (req.method === "OPTIONS") {
      return withSecurityHeaders(
        new Response("", {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,POST,OPTIONS",
            "access-control-allow-headers":
              "content-type,cf-access-jwt-assertion,x-greenbro-device-key",
          },
        }),
      );
    }

    // Assets
    if (path.startsWith("/assets/")) {
      const name = decodeURIComponent(path.replace("/assets/", ""));
      const a = ASSETS[name];
      if (!a) return text("Not found", { status: 404 });
      return withSecurityHeaders(
        new Response(a.body, { headers: { "content-type": a.ct } }),
      );
    }

    // Health (public)
    if (path === "/health") return handleHealth();

    // Public SPA gate (shows login card if not signed in)
    if (path === "/app" || path === "/app/") {
      const user = await requireAccessUser(req, env);
      if (!user) {
        return withSecurityHeaders(
          new Response(appHtml(env, new URL(req.url).searchParams.get("return")), {
            headers: { "content-type": HTML_CT },
          }),
        );
      }
      // server-side landing redirect (APP_BASE_URL should be absolute)
      return Response.redirect(env.APP_BASE_URL + landingFor(user), 302);
    }

    // App logout => Access logout; use absolute redirect to satisfy preview
    if (path === "/app/logout") {
      const ret = url.searchParams.get("return") || env.RETURN_DEFAULT;
      const logoutRelative = `/cdn-cgi/access/logout?return=${encodeURIComponent(ret)}`;
      const logoutAbs = new URL(logoutRelative, req.url).toString();
      return Response.redirect(logoutAbs, 302);
    }

    // Any /app/* path serves SPA (client routing)
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

    // APIs
    if (path === "/api/me" && req.method === "GET") return handleMe(req, env);

    const latestMatch = path.match(/^\/api\/devices\/([^/]+)\/latest$/);
    if (latestMatch && req.method === "GET") {
      return handleLatest(req, env, decodeURIComponent(latestMatch[1]));
    }

    const ingestMatch = path.match(/^\/api\/ingest\/([^/]+)$/);
    if (ingestMatch && req.method === "POST") {
      return handleIngest(req, env, decodeURIComponent(ingestMatch[1]));
    }

    const hbMatch = path.match(/^\/api\/heartbeat\/([^/]+)$/);
    if (hbMatch && req.method === "POST") {
      return handleHeartbeat(req, env, decodeURIComponent(hbMatch[1]));
    }

    return json({ error: "Not found" }, { status: 404 });
  },

  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext) {
    // cron placeholders
  },
};
