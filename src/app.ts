// app.ts
// Cloudflare Worker (TypeScript) — GreenBro Heat Pump Dashboard API + SPA host
// Updates in this version:
//  • CORS helper now returns allow-* headers (and preflight covers device routes)
//  • /api/devices/:id/latest now ENFORCES tenant scope and REDACTS nested device_id
//  • /api/ingest/:profileId and /api/heartbeat/:profileId prevent cross-tenant hijack
//  • Timestamp sanity helper shared (now − 1y … now + 5m)
//  • ops_metrics writes are best-effort (won’t flip success into 500)
//  • deriveUserFromClaims also understands Access groups like client:<id>
//  • NEW: /api/devices (tenant-scoped listing) + cron offline marker

import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

// ---- Types ------------------------------------------------------------------

type Role = "admin" | "contractor" | "client";

interface User {
  email: string;
  roles: Role[];
  clientIds: string[];
}

interface TelemetryMetrics {
  supplyC?: number | null;
  returnC?: number | null;
  tankC?: number | null;
  ambientC?: number | null;
  flowLps?: number | null;
  compCurrentA?: number | null;
  eevSteps?: number | null;
  powerKW?: number | null;
  mode?: string | null;
  defrost?: number | null;
}

interface TelemetryBody {
  device_id: string;
  ts: string; // ISO timestamp
  metrics: TelemetryMetrics;
  faults?: unknown[];
  rssi?: number | null;
}

interface Env {
  DB: D1Database;
  ACCESS_JWKS_URL: string;
  ACCESS_AUD: string;
  APP_BASE_URL: string;   // e.g. "https://your-worker-subdomain.workers.dev"
  RETURN_DEFAULT: string; // e.g. "https://greenbro.co.za"
  HEARTBEAT_INTERVAL_SECS?: string;
  OFFLINE_MULTIPLIER?: string;
}

// ---- Utilities --------------------------------------------------------------

const JSON_CT = "application/json;charset=utf-8";
const HTML_CT = "text/html;charset=utf-8";
const SVG_CT  = "image/svg+xml;charset=utf-8";

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

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function round(n: unknown, dp: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

function nowISO() {
  return new Date().toISOString();
}

function maskId(id: string | null | undefined) {
  if (!id) return "";
  if (id.length <= 4) return "****";
  return id.slice(0, 3) + "…" + id.slice(-2);
}

function parseAndCheckTs(ts: string) {
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return { ok: false as const, reason: "Invalid timestamp" };
  const now = Date.now();
  const ahead = 5 * 60 * 1000;                 // +5 min
  const behind = 365 * 24 * 60 * 60 * 1000;    // ~1 year
  if (ms > now + ahead) return { ok: false as const, reason: "Timestamp too far in future" };
  if (ms < now - behind) return { ok: false as const, reason: "Timestamp too old" };
  return { ok: true as const, ms };
}

// ---- CORS -------------------------------------------------------------------

const CORS_BASE: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,cf-access-jwt-assertion,x-greenbro-device-key",
};

function withCors(res: Response) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_BASE)) h.set(k, v);
  return new Response(res.body, { headers: h, status: res.status, statusText: res.statusText });
}

function maybeHandlePreflight(req: Request, pathname: string) {
  if (req.method !== "OPTIONS") return null;
  if (
    pathname.startsWith("/api/ingest/") ||
    pathname.startsWith("/api/heartbeat/") ||
    /^\/api\/devices\/[^/]+\/latest$/.test(pathname)
  ) {
    return withSecurityHeaders(new Response("", { status: 204, headers: CORS_BASE }));
  }
  return null;
}

// ---- RBAC helpers -----------------------------------------------------------

function deriveUserFromClaims(claims: JWTPayload): User {
  const email = (claims as any).email || claims.sub || "unknown@unknown";

  const rawGroups: string[] = Array.isArray((claims as any).groups)
    ? (claims as any).groups.map(String)
    : [];
  const rawRoles: string[] = Array.isArray((claims as any).roles)
    ? (claims as any).roles.map(String)
    : rawGroups;

  const roles = new Set<Role>();
  for (const r of rawRoles) {
    const v = r.toLowerCase();
    if (v.includes("admin")) roles.add("admin");
    else if (v.includes("contractor")) roles.add("contractor");
    else if (v.includes("client")) roles.add("client");
  }
  if (roles.size === 0) roles.add("client");

  // Accept explicit claim and/or Access groups like "client:<id>"
  const fromClaim = Array.isArray((claims as any).clientIds) ? (claims as any).clientIds.map(String) : [];
  const fromGroups = rawGroups
    .filter(g => g.startsWith("client:"))
    .map(g => g.slice("client:".length));
  const clientIds = Array.from(new Set([...fromClaim, ...fromGroups]));

  return { email, roles: Array.from(roles), clientIds };
}

function landingFor(user: User) {
  if (user.roles.includes("admin")) return "/app/overview";
  if (user.roles.includes("client")) return "/app/compact";
  if (user.roles.includes("contractor")) return "/app/devices";
  return "/app/unauthorized";
}

// ---- Access (Zero Trust) ----------------------------------------------------

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function getJwks(env: Env) {
  const url = env.ACCESS_JWKS_URL;
  if (!jwksCache.has(url)) {
    jwksCache.set(url, createRemoteJWKSet(new URL(url)));
  }
  return jwksCache.get(url)!;
}

async function requireAccessUser(req: Request, env: Env): Promise<User | null> {
  const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, getJwks(env), { audience: env.ACCESS_AUD });
    return deriveUserFromClaims(payload);
  } catch {
    return null;
  }
}

// ---- Assets -----------------------------------------------------------------

const ASSETS: Record<string, { ct: string; body: string }> = {
  "GREENBRO LOGO APP.svg": {
    ct: SVG_CT,
    body: `<svg viewBox="0 0 320 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GreenBro"><rect width="320" height="64" rx="12" fill="#0b1e14"/><text x="32" y="40" font-size="28" font-family="Arial, Helvetica, sans-serif" fill="#52ff99">GreenBro</text></svg>`,
  },
  "Gear_Icon_01.svg": {
    ct: SVG_CT,
    body: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" fill="#52ff99"/><path d="M3 12h3m12 0h3M12 3v3m0 12v3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9 5 19" stroke="#52ff99" stroke-width="2" fill="none"/></svg>`,
  },
  "Gear_Icon_02.svg": {
    ct: SVG_CT,
    body: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="12" height="12" rx="2" stroke="#52ff99" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="2" fill="#52ff99"/></svg>`,
  },
  "Gear_Icon_03.svg": {
    ct: SVG_CT,
    body: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 12a8 8 0 1 0 16 0" stroke="#52ff99" stroke-width="2" fill="none"/><path d="M12 4a8 8 0 0 0 0 16" stroke="#52ff99" stroke-width="2" fill="none"/></svg>`,
  },
};

// ---- Route handlers ----------------------------------------------------------

async function handleHealth() {
  return json({ ok: true, ts: nowISO() });
}

async function handleMe(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return json(user);
}

// GET /api/devices/:id/latest  — tenant-scoped + masking
async function handleLatest(req: Request, env: Env, deviceId: string) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.roles.some(r => r.toLowerCase().includes("admin"));
  let row: any | null;

  if (isAdmin) {
    row = await env.DB.prepare(`SELECT * FROM latest_state WHERE device_id = ?1 LIMIT 1`)
      .bind(deviceId).first();
  } else {
    if (!user.clientIds || user.clientIds.length === 0) {
      return json({ error: "Not found" }, { status: 404 });
    }
    const placeholders = user.clientIds.map((_, i) => `?${i + 2}`).join(",");
    row = await env.DB.prepare(
      `SELECT ls.*
         FROM latest_state ls
         JOIN devices d ON d.device_id = ls.device_id
        WHERE ls.device_id = ?1
          AND d.profile_id IN (${placeholders})
        LIMIT 1`
    ).bind(deviceId, ...user.clientIds).first();
  }

  if (!row) return json({ error: "Not found" }, { status: 404 });

  // Redact nested device_id for non-admins
  let outwardDeviceId = deviceId;
  let latest = row;
  if (!isAdmin) {
    const { device_id: _drop, ...rest } = row;
    latest = rest;
    outwardDeviceId = maskId(deviceId);
  }

  return json({ device_id: outwardDeviceId, latest });
}

// NEW — GET /api/devices (tenant-scoped list)
async function handleListDevices(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.roles.some(r => r.toLowerCase().includes("admin"));
  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "1" || !isAdmin; // default to scoped for non-admin
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? "50")));
  const cursor = url.searchParams.get("cursor"); // ISO timestamp for pagination

  let where = "";
  const bind: any[] = [];

  if (mine) {
    if (!user.clientIds?.length) return json({ items: [], next: null });
    const ph = user.clientIds.map((_, i) => `?${i + 1}`).join(",");
    where = `WHERE d.profile_id IN (${ph})`;
    bind.push(...user.clientIds);
  }

  if (cursor) {
    where += where ? " AND" : "WHERE";
    where += " (d.last_seen_at IS NULL OR d.last_seen_at < ?)";
    bind.push(cursor);
  }

  const sql = `
    SELECT d.device_id, d.profile_id, d.site, d.firmware, d.map_version,
           d.online, d.last_seen_at
      FROM devices d
      ${where}
     ORDER BY (d.last_seen_at IS NOT NULL) DESC, d.last_seen_at DESC
     LIMIT ${limit + 1}
  `;

  const rows = (await env.DB.prepare(sql).bind(...bind).all<{ device_id:string; last_seen_at:string|null; online:number; profile_id:string }>())
    .results ?? [];

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  // Mask device_ids for non-admins
  const items = slice.map(r => ({
    device_id: isAdmin ? r.device_id : maskId(r.device_id),
    profile_id: r.profile_id,
    online: !!r.online,
    last_seen_at: r.last_seen_at,
    site: (r as any).site ?? null,
    firmware: (r as any).firmware ?? null,
    map_version: (r as any).map_version ?? null,
  }));

  const next = hasMore ? (slice[slice.length - 1]?.last_seen_at ?? null) : null;

  return json({ items, next });
}

// Device key check (returns boolean)
async function verifyDeviceKey(env: Env, deviceId: string, keyHeader: string | null) {
  if (!keyHeader) return false;
  const row = await env.DB
    .prepare(`SELECT device_key_hash FROM devices WHERE device_id = ?1`)
    .bind(deviceId)
    .first<{ device_key_hash?: string }>();
  if (!row || !row.device_key_hash) return false;
  const hash = await sha256Hex(keyHeader);
  return hash.toLowerCase() === String(row.device_key_hash).toLowerCase();
}

// POST /api/ingest/:profileId  — tenant-safe + robust
async function handleIngest(req: Request, env: Env, profileId: string) {
  const t0 = Date.now();

  let body: TelemetryBody;
  try {
    // NOTE: no generic arg on json(); cast instead
    body = (await req.json()) as TelemetryBody;
    if (JSON.stringify(body).length > 256_000) {
      return withCors(json({ error: "Payload too large" }, { status: 413 }));
    }
  } catch {
    return withCors(json({ error: "Invalid JSON" }, { status: 400 }));
  }

  if (!body?.device_id || !body?.ts || !body?.metrics) {
    return withCors(json({ error: "Missing required fields" }, { status: 400 }));
  }

  // Timestamp sanity
  const tsCheck = parseAndCheckTs(body.ts);
  if (!tsCheck.ok) return withCors(json({ error: tsCheck.reason }, { status: 400 }));
  const tsMs = tsCheck.ms!;

  // Verify device + key + tenant
  const keyHeader = req.headers.get("X-GREENBRO-DEVICE-KEY");
  if (!(await verifyDeviceKey(env, body.device_id, keyHeader))) {
    return withCors(json({ error: "Unauthorized" }, { status: 401 }));
  }

  const devRow = await env.DB
    .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1`)
    .bind(body.device_id)
    .first<{ profile_id?: string | null }>();

  if (!devRow) {
    return withCors(json({ error: "Unauthorized (unknown device)" }, { status: 401 }));
  }

  if (devRow.profile_id && devRow.profile_id !== profileId) {
    console.warn("Profile mismatch", { deviceId: body.device_id, urlProfileId: profileId, dbProfile: devRow.profile_id });
    return withCors(json({ error: "Profile mismatch for device" }, { status: 409 }));
  }

  // Attach ownership once
  if (!devRow.profile_id) {
    await env.DB.prepare(
      `UPDATE devices SET profile_id = ?2 WHERE device_id = ?1`
    ).bind(body.device_id, profileId).run();
  }

  // Derived metrics
  const supply = body.metrics.supplyC ?? null;
  const ret = body.metrics.returnC ?? null;
  const deltaT = typeof supply === "number" && typeof ret === "number" ? round(supply - ret, 1) : null;

  const flow = body.metrics.flowLps ?? 0;
  const rho = 0.997;  // kg/L ~ water at ~20°C
  const cp  = 4.186;  // kJ/(kg·K)
  const thermalKW = deltaT !== null ? round(rho * cp * flow * (deltaT as number), 2) : null;

  let cop: number | null = null;
  let cop_quality: "measured" | "estimated" | null = null;
  if (typeof body.metrics.powerKW === "number" && body.metrics.powerKW > 0.05 && thermalKW !== null) {
    cop = round((thermalKW as number) / body.metrics.powerKW, 2) as number;
    cop_quality = "measured";
  } else if (thermalKW !== null) {
    cop = null;
    cop_quality = "estimated";
  }

  const faults_json = JSON.stringify(body.faults || []);
  const status_json = JSON.stringify({
    mode: body.metrics.mode ?? null,
    defrost: body.metrics.defrost ?? 0,
    rssi: body.rssi ?? null,
  });

  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT (device_id, ts) DO NOTHING`
      ).bind(
        body.device_id,
        tsMs,
        JSON.stringify(body.metrics),
        deltaT,
        thermalKW,
        cop,
        cop_quality,
        status_json,
        faults_json
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
            updated_at=excluded.updated_at`
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
        nowISO()
      ),
      env.DB.prepare(
        `UPDATE devices SET online=1, last_seen_at=?2 WHERE device_id=?1`
      ).bind(body.device_id, new Date(tsMs).toISOString()),
    ]);

    // Best-effort ops metrics
    try {
      const dur = Date.now() - t0;
      await env.DB.prepare(
        `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES (?1, ?2, ?3, ?4, ?5)`
      ).bind(nowISO(), "/api/ingest", 200, dur, body.device_id).run();
    } catch (e) {
      console.error("ops_metrics insert failed (ingest)", e);
    }

    return withCors(json({ ok: true }));
  } catch (e: any) {
    try {
      const dur = Date.now() - t0;
      await env.DB.prepare(
        `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES (?1, ?2, ?3, ?4, ?5)`
      ).bind(nowISO(), "/api/ingest", 500, dur, body.device_id).run();
    } catch (logErr) {
      console.error("ops_metrics insert failed (ingest error)", logErr);
    }
    return withCors(json({ error: "DB error", detail: String(e?.message || e) }, { status: 500 }));
  }
}

// POST /api/heartbeat/:profileId  — tenant-safe + schema-safe
async function handleHeartbeat(req: Request, env: Env, profileId: string) {
  let body: { device_id: string; ts?: string; rssi?: number | null };
  try {
    body = await req.json();
  } catch {
    return withCors(json({ error: "Invalid JSON" }, { status: 400 }));
  }

  if (!body?.device_id) {
    return withCors(json({ error: "Missing device_id" }, { status: 400 }));
  }

  const tsStr = body.ts ?? new Date().toISOString();
  const tsCheck = parseAndCheckTs(tsStr);
  if (!tsCheck.ok) return withCors(json({ error: tsCheck.reason }, { status: 400 }));
  const tsMs = tsCheck.ms!;

  const keyHeader = req.headers.get("X-GREENBRO-DEVICE-KEY");
  if (!(await verifyDeviceKey(env, body.device_id, keyHeader))) {
    return withCors(json({ error: "Unauthorized" }, { status: 401 }));
  }

  // Enforce tenancy (no silent reassignment)
  const devRow = await env.DB
    .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1`)
    .bind(body.device_id)
    .first<{ profile_id?: string | null }>();

  if (!devRow) {
    return withCors(json({ error: "Unauthorized (unknown device)" }, { status: 401 }));
  }

  if (devRow.profile_id && devRow.profile_id !== profileId) {
    console.warn("Profile mismatch (hb)", { deviceId: body.device_id, urlProfileId: profileId, dbProfile: devRow.profile_id });
    return withCors(json({ error: "Profile mismatch for device" }, { status: 409 }));
  }

  // Attach ownership once
  if (!devRow.profile_id) {
    await env.DB.prepare(
      `UPDATE devices SET profile_id = ?2 WHERE device_id = ?1`
    ).bind(body.device_id, profileId).run();
  }

  // 1) Mark device online + refresh last_seen_at
  // 2) Upsert a minimal latest_state row without touching schema-specific columns
  //    (only the columns we KNOW exist from ingest code: device_id, ts, online, updated_at)
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE devices SET online=1, last_seen_at=?2 WHERE device_id=?1`
    ).bind(body.device_id, new Date(tsMs).toISOString()),

    env.DB.prepare(
      `INSERT INTO latest_state (device_id, ts, online, updated_at)
       VALUES (?1, ?2, 1, ?3)
       ON CONFLICT(device_id) DO UPDATE SET
         ts = excluded.ts,
         online = 1,
         updated_at = excluded.updated_at`
    ).bind(body.device_id, tsMs, nowISO()),
  ]);

  // Best-effort ops metrics (never fail main flow)
  try {
    await env.DB.prepare(
      `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id)
       VALUES (?1, '/api/heartbeat', 200, 0, ?2)`
    ).bind(nowISO(), body.device_id).run();
  } catch (e) {
    console.error("ops_metrics insert failed (hb)", e);
  }

  // If you later add a 'rssi' column in latest_state, you can include it above.
  // For now we just ignore rssi or let ingest record it in telemetry/status.

  return withCors(json({ ok: true, server_time: new Date().toISOString() }));
}

// ---- SPA HTML ---------------------------------------------------------------

function appHtml(env: Env, returnUrlParam: string | null) {
  const returnLink = returnUrlParam || env.RETURN_DEFAULT;

  const css = `
  :root { color-scheme: dark; --bg:#0b0f10; --card:#11181a; --muted:#6b7f7a; --fg:#e9ffef; --brand:#52ff99; --warn:#ffcc66; --err:#ff7a7a; --ok:#7dffa1; }
  *{box-sizing:border-box} html,body,#root{height:100%} body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,Segoe UI,Roboto,Helvetica,Arial}
  a{color:var(--brand);text-decoration:none}
  .nav{display:flex;gap:.75rem;align-items:center;padding:.75rem 1rem;border-bottom:1px solid #17322a;background:#0d1415;position:sticky;top:0}
  .nav .brand{display:flex;align-items:center;gap:.5rem;font-weight:600}
  .tag{padding:.1rem .4rem;border-radius:.4rem;background:#143c2c;color:#72ffb6}
  .sp{flex:1}
  .btn{background:#123026;border:1px solid #1d4a39;color:var(--fg);padding:.5rem .75rem;border-radius:.6rem;cursor:pointer}
  .btn:hover{background:#173a2e}
  .wrap{max-width:1100px;margin:0 auto;padding:1rem}
  .grid{display:grid;gap:1rem}
  .kpis{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
  .card{background:var(--card);border:1px solid #15352a;border-radius:1rem;padding:1rem}
  .muted{color:var(--muted)}
  .hero{font-size:28px}
  input,select{background:#0e1516;border:1px solid #193c30;color:var(--fg);border-radius:.5rem;padding:.5rem .6rem}
  table{width:100%;border-collapse:collapse}
  th,td{padding:.4rem .5rem;border-bottom:1px solid #183328}
  .badge{border:1px solid #2b5a49;border-radius:.4rem;padding:.1rem .35rem}
  `;

  const js = `
  const e=React.createElement;
  const root=ReactDOM.createRoot(document.getElementById('root'));
  const api=path=>fetch(path,{headers:{}}).then(r=>r.ok?r.json():Promise.reject(r));
  const qs=new URLSearchParams(location.search);
  const RETURN_URL = qs.get('return') || ${JSON.stringify(returnLink)};

  function useMe(){
    const [me,setMe]=React.useState(null);
    const [err,setErr]=React.useState(null);
    React.useEffect(()=>{ api('/api/me').then(setMe).catch(()=>setErr(true)); },[]);
    return {me,err};
  }

  function TopNav({me}){
    return e('div',{className:'nav'},
      e('div',{className:'brand'}, e('img',{src:'/assets/GREENBRO LOGO APP.svg',height:24}), 'GreenBro Dashboard'),
      e('span',{className:'tag'}, me? me.roles.join(', ') : 'guest'),
      e('div',{className:'sp'}),
      e('a',{href:'/app/logout?return='+encodeURIComponent(RETURN_URL), className:'btn'}, 'Logout')
    );
  }

  function Page({title,children}) {
    return e('div',null,
      e('div',{className:'wrap'},
        e('h2',null,title),
        children
      )
    );
  }

  function OverviewPage(){
    return e(Page,{title:'Overview (Fleet)'},
      e('div',{className:'grid kpis'},
        e('div',{className:'card'}, e('div',{className:'muted'},'Online %'), e('div',{className:'hero'},'—')),
        e('div',{className:'card'}, e('div',{className:'muted'},'Open Alerts'), e('div',{className:'hero'},'—')),
        e('div',{className:'card'}, e('div',{className:'muted'},'Avg COP (24h)'), e('div',{className:'hero'},'—')),
        e('div',{className:'card'}, e('div',{className:'muted'},'Low-ΔT Count'), e('div',{className:'hero'},'—')),
        e('div',{className:'card'}, e('div',{className:'muted'},'Heartbeat Freshness'), e('div',{className:'hero'},'—'))
      ),
      e('div',{className:'card',style:{marginTop:'1rem'}}, e('b',null,'Regions'), e('div',null,'Gauteng • KZN • Western Cape (filters devices link)'))
    );
  }

  function CompactDashboardPage(){
    return e(Page,{title:'My Sites — Compact'}, 
      e('div',{className:'grid kpis'},
        e('div',{className:'card'}, e('div',{className:'muted'},'Online %'), e('div',{className:'hero'},'—')),
        e('div',{className:'card'}, e('div',{className:'muted'},'Open Alerts'), e('div',{className:'hero'},'—')),
        e('div',{className:'card'}, e('div',{className:'muted'},'Avg COP (24h)'), e('div',{className:'hero'},'—')),
        e('div',{className:'card'}, e('div',{className:'muted'},'Low-ΔT'), e('div',{className:'hero'},'—'))
      ),
      e('div',{className:'card',style:{marginTop:'1rem'}}, e('b',null,'Recent alerts'), e('div',null,'(placeholder)'))
    );
  }

  function DevicesPage(){
    const [id,setId]=React.useState('GB-HP-001234');
    const [data,setData]=React.useState(null);
    const [err,setErr]=React.useState(null);
    const fetchLatest=()=>api('/api/devices/'+encodeURIComponent(id)+'/latest').then(setData).catch(()=>setErr(true));
    return e(Page,{title:'Devices'},
      e('div',{className:'card'},
        e('div',null,
          e('label',null,'Device ID '),
          e('input',{value:id,onChange:e=>setId(e.target.value),style:{marginRight:8}}),
          e('button',{className:'btn',onClick:fetchLatest},'Open')
        ),
        data && e('div',{style:{marginTop:'1rem'}},
          e('div',null, e('b',null,'Device: '), data.device_id),
          e('pre',null, JSON.stringify(data.latest,null,2))
        ),
        err && e('div',{style:{color:"var(--err)"}},'Error loading device')
      )
    );
  }

  function DeviceDetailPage(){
    const [id,setId]=React.useState('GB-HP-001234');
    const [d,setD]=React.useState(null);
    const load=()=>api('/api/devices/'+encodeURIComponent(id)+'/latest').then(setD).catch(()=>setD(null));
    React.useEffect(load,[]);
    const v=(k)=> d?.latest?.[k] ?? '—';
    return e(Page,{title:'Device Detail'},
      e('div',{className:'card'},
        e('div',null, e('label',null,'Device ID '), e('input',{value:id,onChange:e=>setId(e.target.value)}), e('button',{className:'btn',onClick:load,style:{marginLeft:8}},'Load')),
        e('div',{className:'grid',style:{gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',marginTop:'1rem'}},
          ['supplyC','returnC','deltaT','tankC','ambientC','flowLps','compCurrentA','eevSteps','powerKW','thermalKW','cop','mode','defrost','online'].map(k =>
            e('div',{key:k,className:'card'}, e('div',{className:'muted'},k), e('div',{className:'hero'}, String(v(k))))
          )
        ),
        e('div',{className:'muted',style:{marginTop:'1rem'}},'Charts & alerts placeholders')
      )
    );
  }

  function AlertsPage(){ return e(Page,{title:'Alerts'}, e('div',{className:'card'},'(placeholder queues)')); }
  function CommissioningPage(){ return e(Page,{title:'Commissioning & QA'}, e('div',{className:'card'},'(checklist placeholder, Generate Report later)')); }
  function AdminPage(){ return e(Page,{title:'Admin'}, e('div',{className:'card'},'Users, roles, MFA coverage (placeholder)')); }
  function AdminArchivePage(){ return e(Page,{title:'Admin Archive'}, e('div',{className:'card'},'(placeholder)')); }

  function UnauthorizedPage(){
    return e('div',null,
      e('div',{className:'wrap'},
        e('div',{className:'card'}, e('h2',null,'Access required'),
          e('p',null,'Please sign in to continue.'),
          e('a',{className:'btn',href:'/cdn-cgi/access/login?redirect_url='+encodeURIComponent('/app')},'Sign in'),
          e('div',{style:{marginTop:'1rem'}}, e('a',{href: RETURN_URL},'Back to GreenBro'))
        )
      )
    );
  }

  function App(){
    const {me,err} = useMe();

    if (err) return e(UnauthorizedPage);
    if (!me) return e('div',null,e('div',{className:'wrap'}, e('div',{className:'card'}, 'Loading…')));

    const path = location.pathname.replace(/^\\/app\\/?/,'') || '';
    const page = path.split('/')[0];

    if (path==='' || path==='index.html'){
      const landing = (me.roles||[]).includes('admin') ? '/app/overview'
        : (me.roles||[]).includes('client') ? '/app/compact'
        : '/app/devices';
      if (location.pathname !== landing) { history.replaceState(null,'',landing); }
    }

    const content =
      page==='overview' ? e(OverviewPage)
      : page==='compact' ? e(CompactDashboardPage)
      : page==='devices' ? e(DevicesPage)
      : page==='device' ? e(DeviceDetailPage)
      : page==='alerts' ? e(AlertsPage)
      : page==='commissioning' ? e(CommissioningPage)
      : page==='admin' ? e(AdminPage)
      : page==='admin-archive' ? e(AdminArchivePage)
      : e(OverviewPage);

    return e('div',null,
      e(TopNav,{me}),
      content
    );
  }

  root.render(e(App));
  `;

  return `<!doctype html>
<html lang="en-ZA">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>GreenBro — Heat Pump Dashboard</title>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script>${js}</script>
</body>
</html>`;
}

// ---- Worker export -----------------------------------------------------------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // Absolute redirect to avoid "Unable to parse URL: /app" in preview.
    if (path === "/") {
      return Response.redirect(url.origin + "/app", 302);
    }

    // CORS preflight for device routes (ingest/heartbeat/latest)
    const pre = maybeHandlePreflight(req, path);
    if (pre) return pre;

    if (path === "/favicon.ico") {
      return withSecurityHeaders(new Response("", { status: 204 }));
    }

    if (path === "/sw-brand.js") {
      return withSecurityHeaders(
        new Response("// stub\n", { headers: { "content-type": "application/javascript" } }),
      );
    }

    // OPTIONS fallback (non-device paths)
    if (req.method === "OPTIONS") {
      return withSecurityHeaders(new Response("", { status: 204, headers: CORS_BASE }));
    }

    // Static assets
    if (path.startsWith("/assets/")) {
      const name = decodeURIComponent(path.replace("/assets/", ""));
      const a = ASSETS[name];
      if (!a) return text("Not found", { status: 404 });
      return withSecurityHeaders(new Response(a.body, { headers: { "content-type": a.ct } }));
    }

    // Health
    if (path === "/health") return handleHealth();

    // App shell
    if (path === "/app" || path === "/app/") {
      const user = await requireAccessUser(req, env);
      if (!user) {
        return withSecurityHeaders(
          new Response(appHtml(env, new URL(req.url).searchParams.get("return")), {
            headers: { "content-type": HTML_CT },
          }),
        );
      }
      // Redirect to role landing; APP_BASE_URL should be absolute (https://...)
      return Response.redirect(env.APP_BASE_URL + landingFor(user), 302);
    }

    // Logout route – make absolute too
    if (path === "/app/logout") {
      const ret = url.searchParams.get("return") || env.RETURN_DEFAULT;
      const logoutUrl = new URL(
        `/cdn-cgi/access/logout?return=${encodeURIComponent(ret)}`,
        url,
      ).toString();
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

    // API routes
    if (path === "/api/me" && req.method === "GET") return handleMe(req, env);

    // NEW: list devices (tenant-scoped)
    if (path === "/api/devices" && req.method === "GET") {
      return handleListDevices(req, env);
    }

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

  // Cron: mark devices offline if stale (runs via wrangler triggers)
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const hbInterval = Number(env.HEARTBEAT_INTERVAL_SECS ?? "30");
    const multiplier = Number(env.OFFLINE_MULTIPLIER ?? "6");
    const thresholdSecs = Math.max(60, hbInterval * multiplier); // clamp >=60s

    // julianday('now') difference in days; convert seconds -> days
    const days = thresholdSecs / 86400;

    // 1) Find devices that are currently online but stale
    const stale = await env.DB.prepare(
      `SELECT device_id FROM devices
        WHERE online = 1
          AND (last_seen_at IS NULL OR (julianday('now') - julianday(last_seen_at)) > ?1)`
    ).bind(days).all<{ device_id: string }>();

    const ids = stale.results?.map(r => r.device_id) ?? [];
    if (!ids.length) return;

    // 2) Mark them offline and reflect in latest_state
    const updates: D1PreparedStatement[] = [];
    for (const id of ids) {
      updates.push(
        env.DB.prepare(`UPDATE devices SET online=0 WHERE device_id=?1`).bind(id),
      );
      updates.push(
        env.DB.prepare(`UPDATE latest_state SET online=0, updated_at=?2 WHERE device_id=?1`)
          .bind(id, new Date().toISOString()),
      );
      // Optional: write an ops_metrics breadcrumb
      updates.push(
        env.DB.prepare(
          `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id)
           VALUES (?1,'/cron/offline',200,0,?2)`
        ).bind(new Date().toISOString(), id),
      );
    }
    await env.DB.batch(updates);
  },
};
