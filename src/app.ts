// app.ts
// Cloudflare Worker (TypeScript) — GreenBro Heat Pump Dashboard API + SPA host
// Updates in this version:
//  • CORS helper now returns allow-* headers (and preflight covers device routes)
//  • /api/devices/:id/latest ENFORCES tenant scope and REDACTS nested device_id
//  • /api/ingest/:profileId and /api/heartbeat/:profileId prevent cross-tenant hijack
//  • Timestamp sanity helper shared (now − 1y … now + 5m)
//  • ops_metrics writes are best-effort (won’t flip success into 500)
//  • RBAC helpers imported from ./rbac (single source of truth)
//  • NEW: /api/devices (tenant-scoped listing) + cron offline marker
//  • FIX: Treat missing flow as unknown (thermal/COP become null, not zero)
//  • FIX: Harden /api/devices pagination (limit sanitization + robust cursor with NULL last_seen_at)
//  • FIX: Prevent tenant takeover race on first-claim (conditional UPDATE + verify)
//  • FIX: Cron job batching to stay under D1 limits (chunk + multi-row ops_metrics)
//  • FIX: Cursor parsing hardened (safe decode + legacy cursor support)
//  • NEW: /api/fleet/summary endpoint + Overview wired to live KPIs
//  • RBAC: fail-closed (no implicit "client" role)

import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { deriveUserFromClaims, landingFor } from "./rbac";
import type { AccessUser as User } from "./types";

// ---- Types ------------------------------------------------------------------

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
  APP_BASE_URL: string;
  RETURN_DEFAULT: string;
  HEARTBEAT_INTERVAL_SECS?: string;
  OFFLINE_MULTIPLIER?: string;
  CURSOR_SECRET: string;
}

// ---- Utilities ---------------------------------------------------------------

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

function nowISO() { return new Date().toISOString(); }

function maskId(id: string | null | undefined) {
  if (!id) return "";
  if (id.length <= 4) return "****";
  return id.slice(0, 3) + "…" + id.slice(-2);
}

function parseAndCheckTs(ts: string) {
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return { ok: false as const, reason: "Invalid timestamp" };
  const now = Date.now();
  const ahead = 5 * 60 * 1000;              // +5 min
  const behind = 365 * 24 * 60 * 60 * 1000; // ~1 year
  if (ms > now + ahead) return { ok: false as const, reason: "Timestamp too far in future" };
  if (ms < now - behind) return { ok: false as const, reason: "Timestamp too old" };
  return { ok: true as const, ms };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Safe decode for untrusted cursor segments
function safeDecode(part: string | null): string | null {
  if (!part) return null;
  try { return decodeURIComponent(part); } catch { return null; }
}

function base64UrlEncode(data: Uint8Array) {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Uint8Array | null {
  try {
    let normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) normalized += "=";
    const binary = atob(normalized);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

const cursorKeyCache = new Map<string, Promise<CryptoKey>>();

function ensureCursorSecret(env: Env) {
  const secret = env.CURSOR_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("CURSOR_SECRET must be configured (>= 16 characters)");
  }
  return secret;
}

async function importCursorKey(secret: string) {
  if (!cursorKeyCache.has(secret)) {
    const encoder = new TextEncoder();
    const secretHash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
    const keyPromise = crypto.subtle.importKey(
      "raw",
      secretHash,
      "AES-GCM",
      false,
      ["encrypt", "decrypt"],
    );
    cursorKeyCache.set(secret, keyPromise);
  }
  return cursorKeyCache.get(secret)!;
}

async function sealCursorId(env: Env, deviceId: string) {
  const secret = ensureCursorSecret(env);
  const key = await importCursorKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(deviceId),
  );
  return `enc.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`;
}

async function unsealCursorId(env: Env, token: string) {
  const secret = ensureCursorSecret(env);
  const key = await importCursorKey(secret);
  const [, ivPart, dataPart] = token.split(".", 3);
  if (!ivPart || !dataPart) return null;
  const ivArray = base64UrlDecode(ivPart);
  const payloadArray = base64UrlDecode(dataPart);
  if (!ivArray || !payloadArray) return null;
  const ivBuffer = new ArrayBuffer(ivArray.length);
  new Uint8Array(ivBuffer).set(ivArray);
  const payloadBuffer = new ArrayBuffer(payloadArray.length);
  new Uint8Array(payloadBuffer).set(payloadArray);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, key, payloadBuffer);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

async function parseCursorId(
  encoded: string | null,
  env: Env,
  isAdmin: boolean,
): Promise<{ ok: true; id: string | null } | { ok: false }> {
  if (!encoded) return { ok: true, id: null };
  if (!encoded.startsWith("enc.")) {
    return isAdmin ? { ok: true, id: encoded } : { ok: false };
  }
  try {
    const unsealed = await unsealCursorId(env, encoded);
    if (!unsealed) return { ok: false };
    return { ok: true, id: unsealed };
  } catch {
    return { ok: false };
  }
}

// SQL WHERE helper: safely append a clause with the right prefix
function andWhere(where: string, clause: string) {
  return where ? `${where} AND ${clause}` : `WHERE ${clause}`;
}

function userIsAdmin(user: User) {
  return user.roles?.some((r: string) => r.toLowerCase().includes("admin")) ?? false;
}

function buildDeviceScope(user: User, alias = "d") {
  const isAdmin = userIsAdmin(user);
  if (isAdmin) {
    return { isAdmin: true, empty: false, clause: "", bind: [] as any[] };
  }
  const ids = user.clientIds || [];
  if (!ids.length) {
    return { isAdmin: false, empty: true, clause: "", bind: [] as any[] };
  }
  const placeholders = ids.map(() => "?").join(",");
  return {
    isAdmin: false,
    empty: false,
    clause: `${alias}.profile_id IN (${placeholders})`,
    bind: [...ids],
  };
}

function presentDeviceId(id: string, isAdmin: boolean) {
  return isAdmin ? id : maskId(id);
}

function parseFaultsJson(jsonStr: string | null | undefined): string[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f === "string") : [];
  } catch {
    return [];
  }
}

function parseMetricsJson(jsonStr: string | null | undefined): Record<string, any> {
  if (!jsonStr) return {};
  try {
    const parsed = JSON.parse(jsonStr);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

async function resolveDeviceId(raw: string, env: Env, isAdmin: boolean): Promise<string | null> {
  if (isAdmin) return raw;
  if (!raw) return null;
  const parsed = await parseCursorId(raw, env, isAdmin);
  if (!parsed.ok || !parsed.id) return null;
  return parsed.id;
}

async function buildDeviceLookup(id: string, env: Env, isAdmin: boolean) {
  return isAdmin ? id : sealCursorId(env, id);
}

// ---- CORS --------------------------------------------------------------------

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

// ---- Access (Zero Trust) -----------------------------------------------------

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
    return deriveUserFromClaims(payload as JWTPayload);
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

// ---- Route helpers -----------------------------------------------------------

/** First-claim guard: only attach device to tenant if still unclaimed. */
async function claimDeviceIfUnowned(env: Env, deviceId: string, profileId: string) {
  await env.DB.prepare(
    `UPDATE devices SET profile_id = ?2 WHERE device_id = ?1 AND profile_id IS NULL`
  ).bind(deviceId, profileId).run();

  const row = await env.DB
    .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1`)
    .bind(deviceId)
    .first<{ profile_id?: string | null }>();

  if (!row) return { ok: false as const, reason: "unknown_device" };
  if (row.profile_id && row.profile_id !== profileId) {
    return { ok: false as const, reason: "claimed_by_other", owner: row.profile_id };
  }
  return { ok: true as const };
}

// ---- Route handlers ----------------------------------------------------------

async function handleHealth() { return json({ ok: true, ts: nowISO() }); }

async function handleMe(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return json(user);
}

// GET /api/devices/:id/latest  — tenant-scoped + masking
async function handleLatest(req: Request, env: Env, deviceId: string) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = userIsAdmin(user);
  const resolvedId = await resolveDeviceId(deviceId, env, isAdmin);
  if (!resolvedId) return json({ error: "Not found" }, { status: 404 });
  let row: any | null;

  if (isAdmin) {
    row = await env.DB.prepare(`SELECT * FROM latest_state WHERE device_id = ?1 LIMIT 1`)
      .bind(resolvedId).first();
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
    ).bind(resolvedId, ...user.clientIds).first();
  }

  if (!row) return json({ error: "Not found" }, { status: 404 });

  // Redact nested device_id for non-admins
  let outwardDeviceId = presentDeviceId(resolvedId, isAdmin);
  let latest = row;
  if (!isAdmin) {
    const { device_id: _drop, ...rest } = row;
    latest = rest;
  }

  return json({ device_id: outwardDeviceId, latest });
}

// NEW — GET /api/devices (tenant-scoped list) with stable keyset pagination
async function handleListDevices(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.roles.some((r: string) => r.toLowerCase().includes("admin"));

  // ---- patched section: limit/cursor parsing + WHERE ----
  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "1" || !isAdmin;

  // ✅ Sanitize limit (default 50; clamp 1..100; force integer)
  const rawLimit = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(100, Math.floor(rawLimit))
    : 50;

  // ✅ Robust cursor:
  //   - "ts|<ISO>|<lastDeviceId>" pages non-null partition stably (ts DESC, id ASC)
  //   - legacy "ts|<ISO>" still supported (may skip equals)
  //   - "null|<lastDeviceId>" pages NULL partition (id ASC)
  const rawCursor = url.searchParams.get("cursor");
  let cursorPhase: "ts" | "null" | null = null;
  let cursorTs: string | null = null;
  let cursorId: string | null = null;
  if (rawCursor) {
    const parts = rawCursor.split("|", 3);
    const phase = parts[0];
    if (phase === "ts") {
      cursorPhase = "ts";
      const tsPart = parts[1] ?? null;
      cursorTs = safeDecode(tsPart);
      if (tsPart && cursorTs === null) return json({ error: "Invalid cursor" }, { status: 400 });
      const idPartRaw = parts.length >= 3 ? parts[2] ?? null : null;
      const idPart = safeDecode(idPartRaw);
      if (idPartRaw && idPart === null) return json({ error: "Invalid cursor" }, { status: 400 });
      if (idPart) {
        const parsed = await parseCursorId(idPart, env, isAdmin);
        if (!parsed.ok) return json({ error: "Invalid cursor" }, { status: 400 });
        cursorId = parsed.id;
      }
    } else if (phase === "null") {
      cursorPhase = "null";
      const idPartRaw = parts[1] ?? null;
      const idPart = safeDecode(idPartRaw);
      if (!idPart) return json({ error: "Invalid cursor" }, { status: 400 });
      const parsed = await parseCursorId(idPart, env, isAdmin);
      if (!parsed.ok || !parsed.id) return json({ error: "Invalid cursor" }, { status: 400 });
      cursorId = parsed.id;
    }
  }

  let where = "";
  const bind: any[] = [];

  if (mine) {
    if (!user.clientIds?.length) return json({ items: [], next: null });
    const ph = user.clientIds.map((_, i) => `?${i + 1}`).join(",");
    where = `WHERE d.profile_id IN (${ph})`;
    bind.push(...user.clientIds);
  }

  // Apply the cursor window
  if (cursorPhase === "ts" && cursorTs) {
    // Stable keyset: (ts < cursorTs) OR (ts = cursorTs AND id > lastId)
    where += where ? " AND" : "WHERE";
    if (cursorId) {
      where += " ((d.last_seen_at IS NOT NULL AND (d.last_seen_at < ? OR (d.last_seen_at = ? AND d.device_id > ?))) OR d.last_seen_at IS NULL)";
      bind.push(cursorTs, cursorTs, cursorId);
    } else {
      // Legacy (may drop equals, but safe)
      where += " ((d.last_seen_at IS NOT NULL AND d.last_seen_at < ?) OR d.last_seen_at IS NULL)";
      bind.push(cursorTs);
    }
  } else if (cursorPhase === "null" && cursorId) {
    // continue within the NULL partition by device_id
    where += where ? " AND" : "WHERE";
    where += " (d.last_seen_at IS NULL AND d.device_id > ?)";
    bind.push(cursorId);
  }

  const sql = `
    SELECT d.device_id, d.profile_id, d.site, d.firmware, d.map_version,
           d.online, d.last_seen_at
      FROM devices d
      ${where}
     ORDER BY (d.last_seen_at IS NOT NULL) DESC, d.last_seen_at DESC, d.device_id ASC
     LIMIT ${limit + 1}
  `;

  const rows = (await env.DB.prepare(sql).bind(...bind).all<{
    device_id: string; profile_id: string; online: number; last_seen_at: string | null;
  }>()).results ?? [];

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  let items;
  try {
    items = await Promise.all(slice.map(async (r) => ({
      device_id: presentDeviceId(r.device_id, isAdmin),
      lookup: await buildDeviceLookup(r.device_id, env, isAdmin),
      profile_id: r.profile_id,
      online: !!r.online,
      last_seen_at: r.last_seen_at,
      site: (r as any).site ?? null,
      firmware: (r as any).firmware ?? null,
      map_version: (r as any).map_version ?? null,
    })));
  } catch (err) {
    console.error("Failed to build device list", err);
    return json({ error: "Server error" }, { status: 500 });
  }

  // ✅ Encode a cursor that keeps paging even if the last row has NULL last_seen_at
  let next: string | null = null;
  if (hasMore) {
    const last = slice[slice.length - 1];
    let cursorDeviceId = last.device_id;
    if (!isAdmin) {
      try {
        cursorDeviceId = await sealCursorId(env, last.device_id);
      } catch (err) {
        console.error("Failed to seal cursor", err);
        return json({ error: "Server error" }, { status: 500 });
      }
    }
    next = last.last_seen_at
      ? `ts|${encodeURIComponent(last.last_seen_at)}|${encodeURIComponent(cursorDeviceId)}`
      : `null|${encodeURIComponent(cursorDeviceId)}`;
  }

  return json({ items, next });
  // ---- end patched section ----
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

  // Attach ownership once — guarded against races
  if (!devRow.profile_id) {
    const claim = await claimDeviceIfUnowned(env, body.device_id, profileId);
    if (!claim.ok && claim.reason === "claimed_by_other") {
      return withCors(json({ error: "Profile mismatch for device" }, { status: 409 }));
    }
  }

  // Derived metrics
  const supply = body.metrics.supplyC ?? null;
  const ret = body.metrics.returnC ?? null;
  const deltaT = typeof supply === "number" && typeof ret === "number" ? round(supply - ret, 1) : null;

  // Treat missing flow as unknown, not zero.
  const flow = typeof body.metrics.flowLps === "number" ? body.metrics.flowLps : null;

  const rho = 0.997;   // kg/L  (water ~20°C)
  const cp  = 4.186;   // kJ/(kg·K)

  const thermalKW =
    (deltaT !== null && flow !== null)
      ? round(rho * cp * flow * (deltaT as number), 2)
      : null;

  let cop: number | null = null;
  let cop_quality: "measured" | null = null;
  if (thermalKW !== null && typeof body.metrics.powerKW === "number" && body.metrics.powerKW > 0.05) {
    cop = round((thermalKW as number) / body.metrics.powerKW, 2) as number;
    cop_quality = "measured";
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

  // Attach ownership once — guarded against races
  if (!devRow.profile_id) {
    const claim = await claimDeviceIfUnowned(env, body.device_id, profileId);
    if (!claim.ok && claim.reason === "claimed_by_other") {
      return withCors(json({ error: "Profile mismatch for device" }, { status: 409 }));
    }
  }

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

  // Best-effort ops metrics
  try {
    await env.DB.prepare(
      `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id)
       VALUES (?1, '/api/heartbeat', 200, 0, ?2)`
    ).bind(nowISO(), body.device_id).run();
  } catch (e) {
    console.error("ops_metrics insert failed (hb)", e);
  }

  return withCors(json({ ok: true, server_time: new Date().toISOString() }));
}

// GET /api/fleet/summary  — admin or tenant-scoped fleet KPIs (24h window)
async function handleFleetSummary(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const url = new URL(req.url);

  // Sanitize ?hours=... (default 24; clamp 1..168; force integer)
const rawHours = Number(url.searchParams.get("hours"));
const hours = Number.isFinite(rawHours) && rawHours > 0
  ? Math.min(168, Math.floor(rawHours))
  : 24;
const sinceMs = Date.now() - hours * 60 * 60 * 1000;

  // low ΔT threshold (°C); default 2.0
  const lowDeltaParam = url.searchParams.get("lowDeltaT");
  let lowDeltaT = 2;
  if (lowDeltaParam !== null && lowDeltaParam.trim() !== "") {
    const parsed = Number(lowDeltaParam);
    if (Number.isFinite(parsed) && parsed >= 0) {
      lowDeltaT = parsed;
    }
  }

  // --- Base WHERE and binds (use anonymous '?' placeholders, not numbered) ---
  let where = "";
  const bind: any[] = [];

  if (scope.empty) {
    return json({
      devices_total: 0,
      devices_online: 0,
      online_pct: 0,
      avg_cop_24h: null,
      low_deltaT_count_24h: 0,
      max_heartbeat_age_sec: null,
      window_start_ms: sinceMs,
      generated_at: nowISO(),
    });
  }

  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }

  // --- Totals and online ---
  const totalRow = await env.DB
    .prepare(`SELECT COUNT(*) AS c FROM devices d ${where}`)
    .bind(...bind)
    .first<{ c: number }>();

  const onlineRow = await env.DB
    .prepare(`SELECT COUNT(*) AS c FROM devices d ${andWhere(where, "d.online = 1")}`)
    .bind(...bind)
    .first<{ c: number }>();

  const devices_total = totalRow?.c ?? 0;
  const devices_online = onlineRow?.c ?? 0;
  const online_pct = devices_total ? Math.round((devices_online / devices_total) * 100) : 0;

  // --- Telemetry-scoped WHERE (join to devices + time window) ---
  const telemWhere = andWhere(where, "t.ts >= ?");
  const telemBind = [...bind, sinceMs];

  // Avg COP over window
  const avgRow = await env.DB
    .prepare(
      `SELECT AVG(t.cop) AS v
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${telemWhere}`,
    )
    .bind(...telemBind)
    .first<{ v: number | null }>();

  // Low-ΔT count over window
  const lowWhere = andWhere(telemWhere, "t.deltaT IS NOT NULL AND t.deltaT < ?");
  const lowBind = [...telemBind, lowDeltaT];
  const lowRow = await env.DB
    .prepare(
      `SELECT COUNT(*) AS c
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${lowWhere}`,
    )
    .bind(...lowBind)
    .first<{ c: number }>();

  // Max heartbeat age (seconds) across the fleet
  const hbRow = await env.DB
    .prepare(
      `SELECT MAX(
          CASE WHEN d.last_seen_at IS NULL THEN NULL
               ELSE (strftime('%s','now') - strftime('%s', d.last_seen_at))
          END
        ) AS s
       FROM devices d
       ${where}`,
    )
    .bind(...bind)
    .first<{ s: number | null }>();

  return json({
    devices_total,
    devices_online,
    online_pct,
    avg_cop_24h: avgRow?.v ?? null,
    low_deltaT_count_24h: lowRow?.c ?? 0,
    max_heartbeat_age_sec: hbRow?.s ?? null,
    window_start_ms: sinceMs,
    generated_at: nowISO(),
  });
}

async function handleDeviceHistory(req: Request, env: Env, rawDeviceId: string) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const resolvedId = await resolveDeviceId(rawDeviceId, env, scope.isAdmin);
  if (!resolvedId) return json({ error: "Not found" }, { status: 404 });

  if (!scope.isAdmin) {
    if (scope.empty) return json({ error: "Not found" }, { status: 404 });
    const owned = await env.DB.prepare(
      `SELECT 1 FROM devices d WHERE d.device_id = ?1 AND ${scope.clause} LIMIT 1`
    ).bind(resolvedId, ...scope.bind).first();
    if (!owned) return json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(500, Math.floor(rawLimit)) : 72;

  const rows = await env.DB.prepare(
    `SELECT ts, metrics_json, deltaT, thermalKW, cop
       FROM telemetry
      WHERE device_id = ?1
      ORDER BY ts DESC
      LIMIT ${limit}`
  ).bind(resolvedId).all<{
    ts: number;
    metrics_json: string | null;
    deltaT: number | null;
    thermalKW: number | null;
    cop: number | null;
  }>();

  const items = (rows.results ?? []).map((row) => {
    const metrics = parseMetricsJson(row.metrics_json);
    return {
      ts: new Date(row.ts).toISOString(),
      deltaT: row.deltaT ?? null,
      thermalKW: row.thermalKW ?? null,
      cop: row.cop ?? null,
      supplyC: metrics.supplyC ?? null,
      returnC: metrics.returnC ?? null,
      tankC: metrics.tankC ?? null,
      ambientC: metrics.ambientC ?? null,
      flowLps: metrics.flowLps ?? null,
      powerKW: metrics.powerKW ?? null,
      mode: metrics.mode ?? null,
      defrost: metrics.defrost ?? null,
    };
  }).reverse();

  let lookupToken: string;
  try {
    lookupToken = await buildDeviceLookup(resolvedId, env, scope.isAdmin);
  } catch (err) {
    console.error("Failed to build history lookup", err);
    return json({ error: "Server error" }, { status: 500 });
  }

  return json({
    device_id: presentDeviceId(resolvedId, scope.isAdmin),
    lookup: lookupToken,
    items,
  });
}

async function handleClientCompact(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const url = new URL(req.url);

  const rawHours = Number(url.searchParams.get("hours"));
  const hours = Number.isFinite(rawHours) && rawHours > 0 ? Math.min(72, Math.floor(rawHours)) : 24;
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;

  const lowDeltaParam = url.searchParams.get("lowDeltaT");
  let lowDeltaT = 2;
  if (lowDeltaParam !== null && lowDeltaParam.trim() !== "") {
    const parsed = Number(lowDeltaParam);
    if (Number.isFinite(parsed) && parsed >= 0) lowDeltaT = parsed;
  }

  if (scope.empty) {
    return json({
      generated_at: nowISO(),
      scope: "empty",
      window_start_ms: sinceMs,
      kpis: {
        devices_total: 0,
        devices_online: 0,
        offline_count: 0,
        online_pct: 0,
        avg_cop: null,
        low_deltaT_count: 0,
        open_alerts: 0,
        max_heartbeat_age_sec: null,
      },
      alerts: [],
      top_devices: [],
      trend: [],
    });
  }

  let where = "";
  const bind: any[] = [];
  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }

  const totalRow = await env.DB
    .prepare(`SELECT COUNT(*) AS c FROM devices d ${where}`)
    .bind(...bind)
    .first<{ c: number }>();
  const onlineRow = await env.DB
    .prepare(`SELECT COUNT(*) AS c FROM devices d ${andWhere(where, "d.online = 1")}`)
    .bind(...bind)
    .first<{ c: number }>();

  const devices_total = totalRow?.c ?? 0;
  const devices_online = onlineRow?.c ?? 0;
  const offline_count = Math.max(0, devices_total - devices_online);
  const online_pct = devices_total ? Math.round((devices_online / devices_total) * 100) : 0;

  const telemWhere = andWhere(where, "t.ts >= ?");
  const telemBind = [...bind, sinceMs];

  const avgRow = await env.DB
    .prepare(
      `SELECT AVG(t.cop) AS v
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${telemWhere}`,
    )
    .bind(...telemBind)
    .first<{ v: number | null }>();

  const lowWhere = andWhere(telemWhere, "t.deltaT IS NOT NULL AND t.deltaT < ?");
  const lowBind = [...telemBind, lowDeltaT];
  const lowRow = await env.DB
    .prepare(
      `SELECT COUNT(*) AS c
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${lowWhere}`,
    )
    .bind(...lowBind)
    .first<{ c: number }>();

  const hbRow = await env.DB
    .prepare(
      `SELECT MAX(
          CASE WHEN d.last_seen_at IS NULL THEN NULL
               ELSE (strftime('%s','now') - strftime('%s', d.last_seen_at))
          END
        ) AS s
       FROM devices d
       ${where}`,
    )
    .bind(...bind)
    .first<{ s: number | null }>();

  const alertsWhere = andWhere(where, "ls.faults_json IS NOT NULL AND ls.faults_json != '[]' AND ls.faults_json != ''");
  const alertRows = await env.DB
    .prepare(
      `SELECT d.device_id, d.site, d.last_seen_at, ls.faults_json, ls.updated_at, ls.mode, ls.deltaT, ls.cop
         FROM latest_state ls
         JOIN devices d ON d.device_id = ls.device_id
         ${alertsWhere}
        ORDER BY ls.updated_at DESC
        LIMIT 20`,
    )
    .bind(...bind)
    .all<{
      device_id: string;
      site: string | null;
      last_seen_at: string | null;
      faults_json: string | null;
      updated_at: string | null;
      mode: string | null;
      deltaT: number | null;
      cop: number | null;
    }>();

  let openAlertsTotal = 0;
  let alerts;
  try {
    alerts = await Promise.all((alertRows.results ?? []).map(async (row) => {
      const faults = parseFaultsJson(row.faults_json);
      openAlertsTotal += faults.length;
      return {
        device_id: presentDeviceId(row.device_id, scope.isAdmin),
        lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
        site: row.site ?? null,
        last_seen_at: row.last_seen_at ?? null,
        updated_at: row.updated_at ?? null,
        faults,
        mode: row.mode ?? null,
        deltaT: row.deltaT ?? null,
        cop: row.cop ?? null,
      };
    }));
  } catch (err) {
    console.error("Failed to build alerts payload", err);
    return json({ error: "Server error" }, { status: 500 });
  }

  const topRows = await env.DB
    .prepare(
      `SELECT d.device_id, d.site, d.online, d.last_seen_at, ls.cop, ls.deltaT, ls.thermalKW, ls.faults_json, ls.updated_at
         FROM devices d
         LEFT JOIN latest_state ls ON ls.device_id = d.device_id
         ${where}
        ORDER BY d.online DESC, (d.last_seen_at IS NULL), d.last_seen_at DESC, d.device_id ASC
        LIMIT 8`,
    )
    .bind(...bind)
    .all<{
      device_id: string;
      site: string | null;
      online: number;
      last_seen_at: string | null;
      cop: number | null;
      deltaT: number | null;
      thermalKW: number | null;
      faults_json: string | null;
      updated_at: string | null;
    }>();

  let topDevices;
  try {
    topDevices = await Promise.all((topRows.results ?? []).map(async (row) => {
      const faults = parseFaultsJson(row.faults_json);
      return {
        device_id: presentDeviceId(row.device_id, scope.isAdmin),
        lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
        site: row.site ?? null,
        online: !!row.online,
        last_seen_at: row.last_seen_at ?? null,
        updated_at: row.updated_at ?? null,
        cop: row.cop ?? null,
        deltaT: row.deltaT ?? null,
        thermalKW: row.thermalKW ?? null,
        alert_count: faults.length,
      };
    }));
  } catch (err) {
    console.error("Failed to build top devices payload", err);
    return json({ error: "Server error" }, { status: 500 });
  }

  const telemetryRows = await env.DB
    .prepare(
      `SELECT t.ts, t.cop, t.thermalKW, t.deltaT
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${telemWhere}
        ORDER BY t.ts DESC
        LIMIT 160`,
    )
    .bind(...telemBind)
    .all<{
      ts: number;
      cop: number | null;
      thermalKW: number | null;
      deltaT: number | null;
    }>();

  const bucketCount = 8;
  const nowMs = Date.now();
  const spanMs = Math.max(1, nowMs - sinceMs);
  const bucketMs = spanMs / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    start: sinceMs + i * bucketMs,
    end: sinceMs + (i + 1) * bucketMs,
    count: 0,
    cop: 0,
    thermal: 0,
    delta: 0,
  }));

  for (const row of telemetryRows.results ?? []) {
    const idx = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((row.ts - sinceMs) / bucketMs)),
    );
    const bucket = buckets[idx];
    bucket.count += 1;
    if (typeof row.cop === "number") bucket.cop += row.cop;
    if (typeof row.thermalKW === "number") bucket.thermal += row.thermalKW;
    if (typeof row.deltaT === "number") bucket.delta += row.deltaT;
  }

  const trend = buckets.map((bucket) => ({
    label: new Date(Math.min(nowMs, bucket.end)).toISOString(),
    cop: bucket.count ? Number((bucket.cop / bucket.count).toFixed(2)) : null,
    thermalKW: bucket.count ? Number((bucket.thermal / bucket.count).toFixed(2)) : null,
    deltaT: bucket.count ? Number((bucket.delta / bucket.count).toFixed(2)) : null,
  }));

  return json({
    generated_at: nowISO(),
    scope: scope.isAdmin ? "fleet" : "tenant",
    window_start_ms: sinceMs,
    kpis: {
      devices_total,
      devices_online,
      offline_count,
      online_pct,
      avg_cop: avgRow?.v ?? null,
      low_deltaT_count: lowRow?.c ?? 0,
      open_alerts: openAlertsTotal,
      max_heartbeat_age_sec: hbRow?.s ?? null,
    },
    alerts,
    top_devices: topDevices,
    trend,
  });
}

async function handleAlertsFeed(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const url = new URL(req.url);

  const rawLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 40;

  const rawHours = Number(url.searchParams.get("hours"));
  const hours = Number.isFinite(rawHours) && rawHours > 0 ? Math.min(168, Math.floor(rawHours)) : 72;
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;

  if (scope.empty) {
    return json({ generated_at: nowISO(), items: [], stats: { total: 0, active: 0 } });
  }

  let where = "";
  const bind: any[] = [];
  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }

  const faultsWhere = andWhere(andWhere(where, "t.ts >= ?"), "t.faults_json IS NOT NULL AND t.faults_json != '[]' AND t.faults_json != ''");
  const faultRows = await env.DB
    .prepare(
      `SELECT t.device_id, t.ts, t.faults_json, d.site, ls.updated_at AS last_update, ls.faults_json AS latest_faults
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         LEFT JOIN latest_state ls ON ls.device_id = t.device_id
         ${faultsWhere}
        ORDER BY t.ts DESC
        LIMIT ${limit}`,
    )
    .bind(...bind, sinceMs)
    .all<{
      device_id: string;
      ts: number;
      faults_json: string | null;
      site: string | null;
      last_update: string | null;
      latest_faults: string | null;
    }>();

  let items;
  try {
    items = await Promise.all((faultRows.results ?? []).map(async (row) => {
      const faults = parseFaultsJson(row.faults_json);
      const activeFaults = parseFaultsJson(row.latest_faults);
      return {
        device_id: presentDeviceId(row.device_id, scope.isAdmin),
        lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
        site: row.site ?? null,
        ts: new Date(row.ts).toISOString(),
        fault_count: faults.length,
        faults,
        active: activeFaults.length > 0,
        active_faults: activeFaults,
        last_update: row.last_update ?? null,
      };
    }));
  } catch (err) {
    console.error("Failed to build alerts feed", err);
    return json({ error: "Server error" }, { status: 500 });
  }

  const active = items.filter((i: any) => i.active).length;

  return json({
    generated_at: nowISO(),
    items,
    stats: {
      total: items.length,
      active,
    },
  });
}

async function handleCommissioning(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  if (scope.empty && !scope.isAdmin) {
    return json({ generated_at: nowISO(), devices: [], summary: { total: 0, ready: 0 } });
  }

  let where = "";
  const bind: any[] = [];
  if (!scope.isAdmin) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }

  const rows = await env.DB
    .prepare(
      `SELECT d.device_id, d.site, d.online, d.last_seen_at,
              ls.supplyC, ls.returnC, ls.deltaT, ls.flowLps, ls.cop, ls.thermalKW,
              ls.mode, ls.defrost, ls.powerKW, ls.updated_at
         FROM devices d
         LEFT JOIN latest_state ls ON ls.device_id = d.device_id
         ${where}
        ORDER BY d.device_id ASC`,
    )
    .bind(...bind)
    .all<{
      device_id: string;
      site: string | null;
      online: number;
      last_seen_at: string | null;
      supplyC: number | null;
      returnC: number | null;
      deltaT: number | null;
      flowLps: number | null;
      cop: number | null;
      thermalKW: number | null;
      mode: string | null;
      defrost: number | null;
      powerKW: number | null;
      updated_at: string | null;
    }>();

  const devices: any[] = [];
  let readyCount = 0;

  for (const row of rows.results ?? []) {
    const supply = typeof row.supplyC === "number" ? row.supplyC : null;
    const ret = typeof row.returnC === "number" ? row.returnC : null;
    const delta = typeof row.deltaT === "number" ? row.deltaT : null;
    const flow = typeof row.flowLps === "number" ? row.flowLps : null;
    const cop = typeof row.cop === "number" ? row.cop : null;
    const thermal = typeof row.thermalKW === "number" ? row.thermalKW : null;
    const power = typeof row.powerKW === "number" ? row.powerKW : null;
    const mode = row.mode ?? null;

    const sensorsOk = supply !== null && ret !== null && supply > ret;
    const circulationOk = flow !== null && flow > 0.1;
    const deltaOk = delta !== null && delta > 1.5;
    const heatOk = thermal !== null && thermal > 0.5;
    const efficiencyOk = cop !== null && cop >= 2;
    const controlsOk = mode !== null && mode !== "";
    const electricalOk = power !== null && power > 0.05;

    const checklist = [
      { key: "sensors", label: "Sensors aligned", pass: sensorsOk, detail: sensorsOk ? "Supply above return" : "Verify supply/return probes" },
      { key: "circulation", label: "Circulation", pass: circulationOk, detail: circulationOk ? "Flow detected" : "No flow reading" },
      { key: "delta", label: "ΔT within range", pass: deltaOk, detail: deltaOk ? `ΔT ${delta?.toFixed(1)}°C` : "Low delta" },
      { key: "thermal", label: "Thermal output", pass: heatOk, detail: heatOk ? `${thermal?.toFixed(1)} kW` : "No thermal output" },
      { key: "efficiency", label: "Efficiency", pass: efficiencyOk, detail: efficiencyOk ? `COP ${cop?.toFixed(2)}` : "COP below target" },
      { key: "controls", label: "Controls", pass: controlsOk, detail: controlsOk ? `Mode ${mode}` : "Idle / unknown mode" },
      { key: "electrical", label: "Electrical", pass: electricalOk, detail: electricalOk ? `${power?.toFixed(2)} kW draw` : "No power telemetry" },
    ];

    const passed = checklist.filter((c) => c.pass).length;
    const progress = checklist.length ? Number((passed / checklist.length).toFixed(2)) : 0;
    if (progress >= 0.86) readyCount += 1;

    let lookupToken: string;
    try {
      lookupToken = await buildDeviceLookup(row.device_id, env, scope.isAdmin);
    } catch (err) {
      console.error("Failed to build commissioning lookup", err);
      return json({ error: "Server error" }, { status: 500 });
    }

    devices.push({
      device_id: presentDeviceId(row.device_id, scope.isAdmin),
      lookup: lookupToken,
      site: row.site ?? null,
      online: !!row.online,
      last_seen_at: row.last_seen_at ?? null,
      updated_at: row.updated_at ?? null,
      progress,
      checklist,
    });
  }

  return json({
    generated_at: nowISO(),
    devices,
    summary: {
      total: devices.length,
      ready: readyCount,
    },
  });
}

async function handleAdminOverview(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const url = new URL(req.url);

  let tenants;
  if (scope.isAdmin) {
    tenants = await env.DB
      .prepare(
        `SELECT COALESCE(d.profile_id, 'unassigned') AS profile_id,
                COUNT(*) AS device_count,
                SUM(d.online) AS online_count
           FROM devices d
          GROUP BY COALESCE(d.profile_id, 'unassigned')
          ORDER BY device_count DESC`,
      )
      .all<{
        profile_id: string;
        device_count: number;
        online_count: number | null;
      }>();
  } else if (scope.empty) {
    tenants = { results: [] as any[] };
  } else {
    const where = andWhere("", scope.clause);
    tenants = await env.DB
      .prepare(
        `SELECT d.profile_id AS profile_id,
                COUNT(*) AS device_count,
                SUM(d.online) AS online_count
           FROM devices d
           ${where}
          GROUP BY d.profile_id`,
      )
      .bind(...scope.bind)
      .all<{
        profile_id: string | null;
        device_count: number;
        online_count: number | null;
      }>();
  }

  const rawLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 40;

  let opsRows;
  if (scope.isAdmin) {
    opsRows = await env.DB
      .prepare(
        `SELECT ts, route, status_code, duration_ms, device_id
           FROM ops_metrics
          ORDER BY ts DESC
          LIMIT ${limit}`,
      )
      .all<{
        ts: string;
        route: string;
        status_code: number;
        duration_ms: number;
        device_id: string | null;
      }>();
  } else if (scope.empty) {
    opsRows = { results: [] as any[] };
  } else {
    const where = andWhere("", scope.clause.replace(/\bd\./g, "devices."));
    opsRows = await env.DB
      .prepare(
        `SELECT o.ts, o.route, o.status_code, o.duration_ms, o.device_id
           FROM ops_metrics o
           JOIN devices ON devices.device_id = o.device_id
           ${where}
          ORDER BY o.ts DESC
          LIMIT ${limit}`,
      )
      .bind(...scope.bind)
      .all<{
        ts: string;
        route: string;
        status_code: number;
        duration_ms: number;
        device_id: string | null;
      }>();
  }

  const ops = [] as any[];
  for (const row of opsRows.results ?? []) {
    const deviceId = row.device_id;
    let lookupToken: string | null = null;
    let outwardId: string | null = null;
    if (deviceId) {
      try {
        lookupToken = await buildDeviceLookup(deviceId, env, scope.isAdmin);
        outwardId = presentDeviceId(deviceId, scope.isAdmin);
      } catch (err) {
        console.error("Failed to build ops lookup", err);
        return json({ error: "Server error" }, { status: 500 });
      }
    }

    ops.push({
      ts: row.ts,
      route: row.route,
      status_code: row.status_code,
      duration_ms: row.duration_ms,
      device_id: outwardId,
      lookup: lookupToken,
    });
  }

  const statusCounts = ops.reduce<Record<string, number>>((acc, item) => {
    const bucket = item.status_code >= 500 ? "5xx" : item.status_code >= 400 ? "4xx" : "ok";
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});

  return json({
    generated_at: nowISO(),
    scope: scope.isAdmin ? "admin" : scope.empty ? "empty" : "tenant",
    tenants: tenants.results?.map((row) => ({
      profile_id: row.profile_id ?? "unassigned",
      device_count: row.device_count ?? 0,
      online_count: row.online_count ?? 0,
    })) ?? [],
    ops,
    ops_summary: statusCounts,
  });
}

async function handleArchive(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const url = new URL(req.url);

  const rawOffline = Number(url.searchParams.get("offlineHours"));
  const offlineHours = Number.isFinite(rawOffline) && rawOffline > 0 ? Math.min(720, Math.floor(rawOffline)) : 72;
  const offlineThreshold = new Date(Date.now() - offlineHours * 60 * 60 * 1000).toISOString();

  const rawDays = Number(url.searchParams.get("days"));
  const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(30, Math.floor(rawDays)) : 14;
  const historySinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

  if (scope.empty) {
    return json({ generated_at: nowISO(), offline: [], history: [] });
  }

  let where = "";
  const bind: any[] = [];
  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }

  const offlineWhere = andWhere(where, "(d.last_seen_at IS NULL OR d.last_seen_at < ?)");
  const offlineRows = await env.DB
    .prepare(
      `SELECT d.device_id, d.site, d.last_seen_at, d.online, ls.cop, ls.deltaT, ls.faults_json, ls.updated_at
         FROM devices d
         LEFT JOIN latest_state ls ON ls.device_id = d.device_id
         ${offlineWhere}
        ORDER BY d.last_seen_at IS NOT NULL, d.last_seen_at ASC
        LIMIT 25`,
    )
    .bind(...bind, offlineThreshold)
    .all<{
      device_id: string;
      site: string | null;
      last_seen_at: string | null;
      online: number;
      cop: number | null;
      deltaT: number | null;
      faults_json: string | null;
      updated_at: string | null;
    }>();

  let offline;
  try {
    offline = await Promise.all((offlineRows.results ?? []).map(async (row) => ({
      device_id: presentDeviceId(row.device_id, scope.isAdmin),
      lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
      site: row.site ?? null,
      last_seen_at: row.last_seen_at ?? null,
      online: !!row.online,
      cop: row.cop ?? null,
      deltaT: row.deltaT ?? null,
      alerts: parseFaultsJson(row.faults_json).length,
      updated_at: row.updated_at ?? null,
    })));
  } catch (err) {
    console.error("Failed to build archive offline payload", err);
    return json({ error: "Server error" }, { status: 500 });
  }

  const historyWhere = andWhere(andWhere(where, "t.ts >= ?"), "t.ts IS NOT NULL");
  const historyRows = await env.DB
    .prepare(
      `SELECT DATE(t.ts / 1000, 'unixepoch') AS day, COUNT(*) AS samples
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${historyWhere}
        GROUP BY DATE(t.ts / 1000, 'unixepoch')
        ORDER BY day DESC
        LIMIT ${days}`,
    )
    .bind(...bind, historySinceMs)
    .all<{ day: string; samples: number }>();

  const history = (historyRows.results ?? []).map((row) => ({
    day: row.day,
    samples: row.samples,
  }));

  return json({
    generated_at: nowISO(),
    offline,
    history,
  });
}

// ---- SPA HTML ---------------------------------------------------------------

function appHtml(env: Env, returnUrlParam: string | null) {
  const returnLink = returnUrlParam || env.RETURN_DEFAULT;

  const css = String.raw`
:root { color-scheme: dark; --bg:#0b0f10; --card:#11181a; --muted:#6b7f7a; --fg:#e9ffef; --brand:#52ff99; --warn:#ffcc66; --err:#ff7a7a; --ok:#7dffa1; }
*{box-sizing:border-box}
html,body,#root{height:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 'Inter',system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
a{color:var(--brand);text-decoration:none}
.nav{display:flex;gap:.75rem;align-items:center;padding:.75rem 1rem;border-bottom:1px solid #17322a;background:#0d1415;position:sticky;top:0;z-index:10}
.nav .brand{display:flex;align-items:center;gap:.5rem;font-weight:600;font-size:15px}
.tag{padding:.1rem .5rem;border-radius:.5rem;background:#143c2c;color:#72ffb6;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.sp{flex:1}
.btn{background:#123026;border:1px solid #1d4a39;color:var(--fg);padding:.5rem .85rem;border-radius:.6rem;cursor:pointer;font-weight:500}
.btn:hover{background:#173a2e}
.btn.ghost{background:transparent;color:var(--muted);border-color:#1d4032}
.btn.ghost.active{color:var(--fg);background:#123026}
.wrap{max-width:1180px;margin:0 auto;padding:1.2rem}
.grid{display:grid;gap:1rem}
.grid.kpis{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.grid.auto{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem}
.card{background:var(--card);border:1px solid #15352a;border-radius:1rem;padding:1rem;box-shadow:0 10px 25px rgba(0,0,0,0.18)}
.card.tight{padding:.75rem}
.card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem}
.card-title{font-size:16px;font-weight:600}
.muted{color:var(--muted)}
.hero{font-size:32px;font-weight:600}
.large-number{font-size:32px;font-weight:600}
.subdued{color:#889a94;font-size:12px}
.pill{display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .55rem;border-radius:999px;background:#133126;color:#7dffa1;font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.pill.warn{background:#3a2e1a;color:var(--warn)}
.pill.error{background:#3a1f1f;color:var(--err)}
.chip{background:#102119;border:1px solid #1f4532;border-radius:.6rem;padding:.2rem .55rem;font-size:12px;display:inline-flex;align-items:center;gap:.3rem;color:#7dffa1}
.chip.warn{border-color:#4d3c20;color:var(--warn);background:#2a2113}
.chip.error{border-color:#4a2020;color:var(--err);background:#2a1414}
table{width:100%;border-collapse:collapse}
.table th,.table td{padding:.55rem .65rem;border-bottom:1px solid #163226;text-align:left;font-size:13px}
.table tr:hover{background:rgba(82,255,153,0.05)}
.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff7a7a}
.status-dot.ok{background:#7dffa1}
.sparkline{width:100%;height:60px}
.list{display:flex;flex-direction:column;gap:.8rem}
.list-item{display:flex;justify-content:space-between;align-items:flex-start;border:1px solid #163226;border-radius:.85rem;padding:.85rem;background:#0f1716;gap:.75rem}
.list-item .meta{font-size:12px;color:var(--muted)}
.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem}
.metric-tile{background:#101918;border:1px solid #1b382f;border-radius:.85rem;padding:.75rem}
.metric-label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.metric-value{margin-top:.35rem;font-size:20px;font-weight:600}
.metric-sub{color:#86a59c;font-size:12px;margin-top:.2rem}
.checklist{display:flex;flex-direction:column;gap:.45rem;margin-top:.6rem}
.check-item{display:flex;justify-content:space-between;align-items:center;background:#101b19;border:1px solid #1b382f;border-radius:.7rem;padding:.45rem .6rem}
.check-item.fail{background:#1a1111;border-color:#3e1c1c}
.check-item span{font-size:13px}
.progress-bar{background:#132320;border-radius:999px;overflow:hidden;height:8px;margin-top:.4rem}
.progress-bar > div{height:100%;background:linear-gradient(90deg,#1fcc78,#52ff99)}
input,select{background:#0e1516;border:1px solid #193a30;color:var(--fg);border-radius:.6rem;padding:.5rem .6rem;font-size:14px}
.flex{display:flex;gap:1rem;flex-wrap:wrap}
.two-column{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}
.empty{color:var(--muted);font-style:italic}
.tabs{display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}
.stack{display:flex;flex-direction:column;gap:.75rem}
.callout{background:#11231d;border:1px solid #1d4032;border-radius:.8rem;padding:.75rem;font-size:13px;color:#7dffa1}
.callout.warn{background:#2a2113;border-color:#4a3a1a;color:var(--warn)}
.callout.error{background:#2a1414;border-color:#4a2020;color:var(--err)}
.min-table{max-height:320px;overflow:auto}
.chart-card{padding:0}
.chart-card svg{display:block;width:100%;height:160px}
.section-title{font-size:18px;margin:0 0 .5rem 0;font-weight:600}
.link{color:var(--brand);text-decoration:none}
.link:hover{text-decoration:underline}
.mono{font-family:'JetBrains Mono',monospace}
.badge{border:1px solid #2b5a49;border-radius:.4rem;padding:.2rem .45rem;font-size:12px}
.pill + .pill{margin-left:.4rem}
.card-group{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem}
.history-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem}
.history-card{background:#101918;border:1px solid #1b382f;border-radius:.75rem;padding:.6rem .75rem}
.history-card strong{font-size:16px}
@media (max-width:720px){.nav{flex-wrap:wrap;gap:.5rem}.nav .sp{display:none}.grid.kpis{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}}

`;

  const js = String.raw`
const e=React.createElement;
const root=ReactDOM.createRoot(document.getElementById('root'));
const api=path=>fetch(path,{headers:{}}).then(r=>r.ok?r.json():Promise.reject(r));
const qs=new URLSearchParams(location.search);
const RETURN_URL = qs.get('return') || ${JSON.stringify(returnLink)};

function useMe(){
  const [me,setMe]=React.useState(null);
  const [err,setErr]=React.useState(null);
  React.useEffect(()=>{
    api('/api/me').then(setMe).catch(()=>setErr(true));
  },[]);
  return {me,err};
}

function TopNav({me}){
  return e('div',{className:'nav'},
    e('div',{className:'brand'}, e('img',{src:'/assets/GREENBRO LOGO APP.svg',height:24,alt:'GreenBro'}),'GreenBro Dashboard'),
    e('span',{className:'tag'}, me? (me.roles && me.roles.length? me.roles.join(', ') : 'no-role') : 'guest'),
    e('div',{className:'sp'}),
    e('a',{href:'/app/logout?return='+encodeURIComponent(RETURN_URL),className:'btn'},'Logout')
  );
}

function Page({title,children,actions}){
  return e('div',null,
    e('div',{className:'wrap'},
      e('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem',flexWrap:'wrap'}},
        e('h2',{style:{margin:0}},title),
        actions || null
      ),
      children
    )
  );
}

function formatNumber(value,dp=1){
  if(value===null||value===undefined||Number.isNaN(value)) return '—';
  const mult=Math.pow(10,dp);
  return String(Math.round(value*mult)/mult);
}

function formatPercent(value,dp=0){
  if(value===null||value===undefined||Number.isNaN(value)) return '—';
  return formatNumber(value,dp)+'%';
}

function formatRelative(ts){
  if(!ts) return '—';
  const d=new Date(ts);
  if(Number.isNaN(d.getTime())) return ts;
  const diff=Date.now()-d.getTime();
  const suffix=diff>=0?'ago':'from now';
  const ms=Math.abs(diff);
  const minutes=Math.round(ms/60000);
  if(minutes<1) return 'just now';
  if(minutes<60) return minutes+'m '+suffix;
  const hours=Math.round(minutes/60);
  if(hours<48) return hours+'h '+suffix;
  const days=Math.round(hours/24);
  return days+'d '+suffix;
}

function formatDate(ts){
  if(!ts) return '—';
  const d=new Date(ts);
  if(Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function Sparkline({values,color='#52ff99'}){
  const data=(values||[]).filter(v=>typeof v==='number' && !Number.isNaN(v));
  if(!data.length){
    return e('div',{className:'empty'},'No data');
  }
  const min=Math.min(...data);
  const max=Math.max(...data);
  const points=data.map((v,i)=>{
    const x=data.length===1?100:(i/(data.length-1))*100;
    const norm=max===min?0.5:(v-min)/(max-min);
    const y=100-(norm*100);
    return x.toFixed(2)+','+y.toFixed(2);
  }).join(' ');
  return e('svg',{className:'sparkline',viewBox:'0 0 100 100'},
    e(React.Fragment,null,
      e('polyline',{points,fill:'none',stroke:color,'stroke-width':6,opacity:0.08,'stroke-linecap':'round'}),
      e('polyline',{points,fill:'none',stroke:color,'stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round'})
    )
  );
}

function OverviewPage({me}){
  const [data,setData]=React.useState(null);
  const [error,setError]=React.useState(false);
  React.useEffect(()=>{
    api('/api/fleet/summary').then(setData).catch(()=>setError(true));
  },[]);
  return e(Page,{title:'Overview (Fleet)'},[
    e('div',{className:'grid kpis'},[
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Online %'),
        e('div',{className:'large-number'},formatPercent(data?.online_pct)),
        e('div',{className:'subdued'},(data?.devices_online||0)+'/'+(data?.devices_total||0)+' online')
      ]),
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Avg COP (24h)'),
        e('div',{className:'large-number'},formatNumber(data?.avg_cop_24h,2)),
        e('div',{className:'subdued'},'Window start '+formatRelative(data?.window_start_ms))
      ]),
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Low ΔT events'),
        e('div',{className:'large-number'},formatNumber(data?.low_deltaT_count_24h||0,0)),
        e('div',{className:'subdued'},'Oldest heartbeat '+formatNumber((data?.max_heartbeat_age_sec||0)/60,1)+'m')
      ])
    ]),
    e('div',{className:'card',style:{marginTop:'1rem'}},[
      e('div',{className:'card-title'},'Devices'),
      e('div',{className:'subdued'},data? data.devices_online+'/'+data.devices_total+' online':'—')
    ]),
    error? e('div',{className:'card callout error',style:{marginTop:'1rem'}},'Failed to load fleet metrics'):null
  ]);
}

function CompactDashboardPage(){
  const [summary,setSummary]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState(false);
  const [devices,setDevices]=React.useState([]);
  const [trendKey,setTrendKey]=React.useState('cop');
  React.useEffect(()=>{
    let cancelled=false;
    api('/api/client/compact').then(data=>{
      if(!cancelled){
        setSummary(data);
        setLoading(false);
      }
    }).catch(()=>{
      if(!cancelled){
        setError(true);
        setLoading(false);
      }
    });
    api('/api/devices?mine=1&limit=12').then(res=>{
      if(!cancelled){
        setDevices(res.items||[]);
      }
    }).catch(()=>{});
    return ()=>{cancelled=true;};
  },[]);
  if(loading) return e(Page,{title:'My Sites — Compact'}, e('div',{className:'card'},'Loading…'));
  if(error || !summary) return e(Page,{title:'My Sites — Compact'}, e('div',{className:'card callout error'},'Unable to load dashboard data'));
  const k=summary.kpis||{};
  const trendValues=(summary.trend||[]).map(p=>typeof p[trendKey]==='number'?p[trendKey]:null);
  const trendSubtitle=trendKey==='cop'?'Fleet average COP':(trendKey==='thermalKW'?'Thermal output (kW)':'ΔT average (°C)');
  return e(Page,{title:'My Sites — Compact'},[
    e('div',{className:'grid kpis',key:'kpis'},[
      e('div',{className:'card tight',key:'online'},[
        e('div',{className:'muted'},'Online rate'),
        e('div',{className:'large-number'},formatPercent(k.online_pct)),
        e('div',{className:'subdued'},(k.devices_online||0)+'/'+(k.devices_total||0)+' devices online')
      ]),
      e('div',{className:'card tight',key:'alerts'},[
        e('div',{className:'muted'},'Open alerts'),
        e('div',{className:'large-number'},formatNumber(k.open_alerts||0,0)),
        e('div',{className:'subdued'},summary.alerts && summary.alerts.length? summary.alerts.length+' devices affected':'Monitoring')
      ]),
      e('div',{className:'card tight',key:'cop'},[
        e('div',{className:'muted'},'Avg COP'),
        e('div',{className:'large-number'},formatNumber(k.avg_cop,2)),
        e('div',{className:'subdued'},'Window start '+formatRelative(summary.window_start_ms))
      ]),
      e('div',{className:'card tight',key:'delta'},[
        e('div',{className:'muted'},'Low ΔT (24h)'),
        e('div',{className:'large-number'},formatNumber(k.low_deltaT_count||0,0)),
        e('div',{className:'subdued'},k.max_heartbeat_age_sec? 'Oldest heartbeat '+formatNumber((k.max_heartbeat_age_sec||0)/60,1)+'m':'All fresh')
      ])
    ]),
    e('div',{className:'card chart-card',key:'trend'},[
      e('div',{className:'card-header'},[
        e('div',null,[
          e('div',{className:'muted'},'Performance trend'),
          e('div',{style:{fontSize:'16px',fontWeight:600,marginTop:'.2rem'}},trendSubtitle)
        ]),
        e('div',{className:'tabs'},[
          e('button',{className:'btn ghost'+(trendKey==='cop'?' active':''),onClick:()=>setTrendKey('cop')},'COP'),
          e('button',{className:'btn ghost'+(trendKey==='thermalKW'?' active':''),onClick:()=>setTrendKey('thermalKW')},'Thermal kW'),
          e('button',{className:'btn ghost'+(trendKey==='deltaT'?' active':''),onClick:()=>setTrendKey('deltaT')},'ΔT')
        ])
      ]),
      e('div',{style:{padding:'0 1rem 1rem'}},
        e(Sparkline,{values:trendValues,color:trendKey==='cop'?'#52ff99':(trendKey==='thermalKW'?'#7d96ff':'#ffcc66')})
      )
    ]),
    e('div',{className:'card',key:'alerts-card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Recent alerts'),
        summary.alerts && summary.alerts.length? e('span',{className:'pill warn'},summary.alerts.length+' active'):e('span',{className:'pill'},'Stable')
      ]),
      summary.alerts && summary.alerts.length? e('div',{className:'list'},
        summary.alerts.map((alert,idx)=>e('div',{className:'list-item',key:alert.lookup||idx},[
          e('div',null,[
            e('div',{style:{fontWeight:600}},alert.device_id),
            alert.site? e('div',{className:'subdued'},alert.site):null,
            e('div',{className:'meta'},'Updated '+formatRelative(alert.updated_at))
          ]),
          e('div',{style:{textAlign:'right'}},[
            e('div',null,(alert.faults||[]).slice(0,3).join(', ') || 'Fault reported'),
            e('div',{className:'meta'},alert.faults && alert.faults.length>3? '+'+(alert.faults.length-3)+' more':''),
            e('a',{href:'/app/device?device='+encodeURIComponent(alert.lookup),className:'link',style:{marginTop:'.4rem',display:'inline-block'}},'Open')
          ])
        ]))
      ): e('div',{className:'empty'},'No alerts in the selected window')
    ]),
    e('div',{className:'card',key:'devices-card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Device roster'),
        e('div',{className:'subdued'},devices.length? devices.length+' listed':'No devices yet')
      ]),
      devices.length? e('div',{className:'min-table'},
        e('table',{className:'table'},
          e('thead',null,
            e('tr',null,[
              e('th',null,'Device'),
              e('th',null,'Site'),
              e('th',null,'Online'),
              e('th',null,'Last heartbeat'),
              e('th',null,'Firmware')
            ])
          ),
          e('tbody',null,
            devices.map((d,idx)=>e('tr',{key:d.lookup||idx},[
              e('td',null,e('a',{href:'/app/device?device='+encodeURIComponent(d.lookup),className:'link'},d.device_id||'(device)')),
              e('td',null,d.site || '—'),
              e('td',null,e('span',{className:'status-dot'+(d.online?' ok':''),title:d.online?'Online':'Offline'})),
              e('td',null,formatRelative(d.last_seen_at)),
              e('td',null,d.firmware || '—')
            ]))
          )
        )
      ): e('div',{className:'empty'},'No devices in scope')
    ])
  ]);
}

function DevicesPage(){
  const [items,setItems]=React.useState([]);
  const [cursor,setCursor]=React.useState(null);
  const [loading,setLoading]=React.useState(false);
  const [error,setError]=React.useState(false);

  const load=React.useCallback((next)=>{
    setLoading(true);
    setError(false);
    const url='/api/devices?mine=1&limit=25'+(next?'&cursor='+encodeURIComponent(next):'');
    api(url).then(res=>{
      setItems(prev=> next? prev.concat(res.items||[]):(res.items||[]));
      setCursor(res.next||null);
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  React.useEffect(()=>{ load(null); },[load]);

  return e(Page,{title:'Devices'},[
    e('div',{className:'card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Devices in scope'),
        error? e('span',{className:'pill error'},'Error fetching list'):null
      ]),
      items.length? e('div',{className:'min-table'},
        e('table',{className:'table'},
          e('thead',null,e('tr',null,[
            e('th',null,'Device'),
            e('th',null,'Site'),
            e('th',null,'Status'),
            e('th',null,'Last seen'),
            e('th',null,'Profile')
          ])),
          e('tbody',null,
            items.map((d,idx)=>e('tr',{key:d.lookup||idx},[
              e('td',null,e('a',{href:'/app/device?device='+encodeURIComponent(d.lookup),className:'link'},d.device_id)),
              e('td',null,d.site || '—'),
              e('td',null,e('span',{className:'status-dot'+(d.online?' ok':''),title:d.online?'Online':'Offline'})),
              e('td',null,formatRelative(d.last_seen_at)),
              e('td',null,d.profile_id || '—')
            ]))
          )
        )
      ): e('div',{className:'empty'},loading?'Loading…':'No devices'),
      e('div',{style:{marginTop:'1rem',display:'flex',justifyContent:'space-between',alignItems:'center'}},[
        e('div',{className:'subdued'},cursor? 'More devices available':'End of list'),
        cursor? e('button',{className:'btn',disabled:loading,onClick:()=>load(cursor)},loading?'Loading…':'Load more'):null
      ])
    ])
  ]);
}
function DeviceDetailPage(){
  const queryLookup = qs.get('device') || '';
  const [devices,setDevices]=React.useState([]);
  const [selected,setSelected]=React.useState(queryLookup);
  const [selectedDisplay,setSelectedDisplay]=React.useState('');
  const [latest,setLatest]=React.useState(null);
  const [historyData,setHistoryData]=React.useState([]);
  const [loading,setLoading]=React.useState(false);
  const [error,setError]=React.useState(false);

  const load=React.useCallback((lookup)=>{
    if(!lookup) return;
    setLoading(true);
    setError(false);
    Promise.all([
      api('/api/devices/'+encodeURIComponent(lookup)+'/latest'),
      api('/api/devices/'+encodeURIComponent(lookup)+'/history?limit=120')
    ]).then(([latestRes,historyRes])=>{
      setLatest(latestRes);
      setHistoryData(historyRes.items||[]);
      setSelectedDisplay(latestRes && latestRes.device_id? latestRes.device_id : '');
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  React.useEffect(()=>{
    let cancelled=false;
    api('/api/devices?mine=1&limit=50').then(res=>{
      if(cancelled) return;
      const items=res.items||[];
      setDevices(items);
      if(!selected && items[0]){
        setSelected(items[0].lookup);
      }
    }).catch(()=>{});
    return ()=>{cancelled=true;};
  },[]);

  React.useEffect(()=>{
    if(!selected) return;
    load(selected);
    const url=new URL(location.href);
    url.searchParams.set('device',selected);
    history.replaceState(null,'',url.pathname+'?'+url.searchParams.toString());
  },[selected,load]);

  const metrics=latest && latest.latest? latest.latest : {};
  const historySeries={
    supply: historyData.map(h=>typeof h.supplyC==='number'?h.supplyC:null),
    return: historyData.map(h=>typeof h.returnC==='number'?h.returnC:null),
    thermal: historyData.map(h=>typeof h.thermalKW==='number'?h.thermalKW:null),
    cop: historyData.map(h=>typeof h.cop==='number'?h.cop:null)
  };
  const displayHistory=historyData.slice(-10);

  const renderMetric=(key,label,dp=1)=>{
    const value=metrics[key];
    if(value===null||value===undefined) return e('div',{className:'metric-tile',key:key},[
      e('div',{className:'metric-label'},label),
      e('div',{className:'metric-value'},'—')
    ]);
    if(typeof value==='number'){
      return e('div',{className:'metric-tile',key:key},[
        e('div',{className:'metric-label'},label),
        e('div',{className:'metric-value'},formatNumber(value,dp))
      ]);
    }
    return e('div',{className:'metric-tile',key:key},[
      e('div',{className:'metric-label'},label),
      e('div',{className:'metric-value'},String(value))
    ]);
  };

  return e(Page,{title:'Device detail'},[
    e('div',{className:'card'},[
      e('div',{className:'flex'},[
        e('div',{style:{flex:'1 1 220px'}},[
          e('label',{className:'muted'},'Device'),
          e('select',{value:selected||'',onChange:ev=>setSelected(ev.target.value)},[
            e('option',{value:''},'Select a device'),
            devices.map(d=>e('option',{value:d.lookup,key:d.lookup},d.device_id))
          ])
        ]),
        e('button',{className:'btn',style:{alignSelf:'flex-end'},onClick:()=>selected && load(selected),disabled:!selected||loading},loading?'Loading…':'Refresh')
      ]),
      error? e('div',{className:'callout error',style:{marginTop:'1rem'}},'Unable to load device data'):null,
      latest? e('div',{className:'stack',style:{marginTop:'1rem'}},[
        e('div',{className:'grid-3'},[
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Device ID'),
            e('div',{className:'large-number'},selectedDisplay || latest.device_id || '—'),
            e('div',{className:'subdued'},metrics.updated_at? 'Updated '+formatRelative(metrics.updated_at): (metrics.ts? 'Sample '+formatRelative(metrics.ts):''))
          ]),
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Status'),
            e('div',{style:{display:'flex',alignItems:'center',gap:'.5rem',marginTop:'.4rem'}},[
              e('span',{className:'status-dot'+(metrics.online?' ok':''),title:metrics.online?'Online':'Offline'}),
              e('span',null,metrics.online?'Online':'Offline')
            ]),
            e('div',{className:'subdued'},metrics.mode? 'Mode '+metrics.mode:'Mode unknown')
          ]),
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Site'),
            e('div',{className:'large-number'},(devices.find(d=>d.lookup===selected)?.site)||'—'),
            e('div',{className:'subdued'},'Last heartbeat '+formatRelative(devices.find(d=>d.lookup===selected)?.last_seen_at || metrics.updated_at))
          ])
        ]),
        e('div',{className:'metric-grid'},[
          renderMetric('supplyC','Supply °C',1),
          renderMetric('returnC','Return °C',1),
          renderMetric('deltaT','ΔT °C',2),
          renderMetric('flowLps','Flow L/s',2),
          renderMetric('thermalKW','Thermal kW',2),
          renderMetric('cop','COP',2),
          renderMetric('powerKW','Power kW',2),
          renderMetric('tankC','Tank °C',1),
          renderMetric('ambientC','Ambient °C',1),
          renderMetric('defrost','Defrost'),
          renderMetric('mode','Mode')
        ]),
        e('div',{className:'grid auto',style:{marginTop:'1rem'}},[
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Supply trend'),
            e(Sparkline,{values:historySeries.supply,color:'#52ff99'}),
            e('div',{className:'subdued'},'Latest '+formatNumber(historySeries.supply.length?historySeries.supply[historySeries.supply.length-1]:null,1)+'°C')
          ]),
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Return trend'),
            e(Sparkline,{values:historySeries.return,color:'#86a5ff'}),
            e('div',{className:'subdued'},'Latest '+formatNumber(historySeries.return.length?historySeries.return[historySeries.return.length-1]:null,1)+'°C')
          ]),
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'Thermal output'),
            e(Sparkline,{values:historySeries.thermal,color:'#ffcc66'}),
            e('div',{className:'subdued'},'Latest '+formatNumber(historySeries.thermal.length?historySeries.thermal[historySeries.thermal.length-1]:null,2)+' kW')
          ]),
          e('div',{className:'card tight'},[
            e('div',{className:'muted'},'COP trend'),
            e(Sparkline,{values:historySeries.cop,color:'#52ff99'}),
            e('div',{className:'subdued'},'Latest '+formatNumber(historySeries.cop.length?historySeries.cop[historySeries.cop.length-1]:null,2))
          ])
        ]),
        displayHistory.length? e('div',{className:'card',style:{marginTop:'1rem'}},[
          e('div',{className:'card-header'},[
            e('div',{className:'card-title'},'Recent telemetry'),
            e('div',{className:'subdued'},displayHistory.length+' samples')
          ]),
          e('div',{className:'min-table'},
            e('table',{className:'table'},[
              e('thead',null,e('tr',null,[
                e('th',null,'Timestamp'),
                e('th',null,'Supply'),
                e('th',null,'Return'),
                e('th',null,'Thermal kW'),
                e('th',null,'COP')
              ])),
              e('tbody',null,
                displayHistory.map((row,idx)=>e('tr',{key:idx},[
                  e('td',null,formatDate(row.ts)),
                  e('td',null,formatNumber(row.supplyC,1)),
                  e('td',null,formatNumber(row.returnC,1)),
                  e('td',null,formatNumber(row.thermalKW,2)),
                  e('td',null,formatNumber(row.cop,2))
                ]))
              )
            ])
          )
        ]):null
      ]): e('div',{className:'empty',style:{marginTop:'1rem'}},selected?'Select refresh to load details':'Choose a device to load telemetry')
    ])
  ]);
}
function AlertsPage(){
  const [data,setData]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState(false);

  React.useEffect(()=>{
    api('/api/alerts/recent').then(res=>{
      setData(res);
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  if(loading) return e(Page,{title:'Alerts'}, e('div',{className:'card'},'Loading…'));
  if(error || !data) return e(Page,{title:'Alerts'}, e('div',{className:'card callout error'},'Unable to load alerts'));

  return e(Page,{title:'Alerts'},[
    e('div',{className:'grid kpis'},[
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Total alerts'),
        e('div',{className:'large-number'},formatNumber(data.stats?.total||0,0))
      ]),
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Active now'),
        e('div',{className:'large-number'},formatNumber(data.stats?.active||0,0))
      ]),
      e('div',{className:'card tight'},[
        e('div',{className:'muted'},'Window'),
        e('div',{className:'large-number'},'Last '+(qs.get('hours') || '72h'))
      ])
    ]),
    e('div',{className:'stack'},
      (data.items||[]).length? data.items.map((alert,idx)=>e('div',{className:'card',key:alert.lookup||idx},[
        e('div',{className:'card-header'},[
          e('div',null,[
            e('div',{className:'card-title'},alert.device_id),
            alert.site? e('div',{className:'subdued'},alert.site):null
          ]),
          alert.active? e('span',{className:'pill warn'},'Active'):e('span',{className:'pill'},'Cleared')
        ]),
        e('div',{className:'list'},[
          e('div',{className:'list-item'},[
            e('div',null,[
              e('div',null,(alert.faults||[]).join(', ') || 'Fault reported'),
              e('div',{className:'meta'},'Triggered '+formatRelative(alert.ts))
            ]),
            e('div',{style:{textAlign:'right'}},[
              e('div',{className:'meta'},alert.last_update? 'Last update '+formatRelative(alert.last_update):'No recent update'),
              e('a',{href:'/app/device?device='+encodeURIComponent(alert.lookup),className:'link'},'Inspect device')
            ])
          ])
        ])
      ])) : e('div',{className:'card'},e('div',{className:'empty'},'No alerts during this window'))
    )
  ]);
}

function CommissioningPage(){
  const [data,setData]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState(false);

  React.useEffect(()=>{
    api('/api/commissioning/checklist').then(res=>{
      setData(res);
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  if(loading) return e(Page,{title:'Commissioning & QA'}, e('div',{className:'card'},'Loading…'));
  if(error || !data) return e(Page,{title:'Commissioning & QA'}, e('div',{className:'card callout error'},'Unable to load commissioning status'));

  return e(Page,{title:'Commissioning & QA'},[
    e('div',{className:'card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Readiness overview'),
        e('span',{className:'pill'},(data.summary?.ready||0)+' ready of '+(data.summary?.total||0))
      ]),
      e('div',{className:'callout',style:{marginTop:'.6rem'}}, data.summary?.total? Math.round((data.summary.ready||0)/(data.summary.total||1)*100)+'% checklist complete across fleet':'No devices in scope')
    ]),
    e('div',{className:'stack',style:{marginTop:'1rem'}},
      (data.devices||[]).map((device,idx)=>e('div',{className:'card',key:device.lookup||idx},[
        e('div',{className:'card-header'},[
          e('div',null,[
            e('div',{className:'card-title'},device.device_id),
            device.site? e('div',{className:'subdued'},device.site):null
          ]),
          e('span',{className:'pill'+(device.progress>=0.86?'':' warn')},Math.round((device.progress||0)*100)+'%')
        ]),
        e('div',{className:'subdued'},'Last heartbeat '+formatRelative(device.last_seen_at || device.updated_at)),
        e('div',{className:'progress-bar'},e('div',{style:{width:Math.round((device.progress||0)*100)+'%'}})),
        e('div',{className:'checklist'},
          device.checklist.map(item=>e('div',{className:'check-item'+(item.pass?'':' fail'),key:item.key},[
            e('span',null,item.label),
            e('span',{className:'subdued'},item.detail)
          ]))
        ),
        e('div',{style:{marginTop:'.6rem'}},e('a',{href:'/app/device?device='+encodeURIComponent(device.lookup),className:'link'},'Open device'))
      ]))
    )
  ]);
}

function AdminPage(){
  const [data,setData]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState(false);

  React.useEffect(()=>{
    api('/api/admin/overview').then(res=>{
      setData(res);
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  if(loading) return e(Page,{title:'Admin'}, e('div',{className:'card'},'Loading…'));
  if(error || !data) return e(Page,{title:'Admin'}, e('div',{className:'card callout error'},'Unable to load admin overview'));

  return e(Page,{title:'Admin'},[
    e('div',{className:'card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Tenants'),
        e('span',{className:'pill'},(data.tenants||[]).length+' profiles')
      ]),
      (data.tenants||[]).length? e('div',{className:'min-table'},
        e('table',{className:'table'},[
          e('thead',null,e('tr',null,[
            e('th',null,'Profile'),
            e('th',null,'Devices'),
            e('th',null,'Online')
          ])),
          e('tbody',null,
            data.tenants.map((row,idx)=>e('tr',{key:row.profile_id||idx},[
              e('td',null,row.profile_id),
              e('td',null,formatNumber(row.device_count||0,0)),
              e('td',null,formatNumber(row.online_count||0,0))
            ]))
          )
        ])
      ): e('div',{className:'empty'},'No tenant data')
    ]),
    e('div',{className:'card',style:{marginTop:'1rem'}},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Recent operations'),
        e('span',{className:'pill'},(data.ops||[]).length+' events')
      ]),
      (data.ops||[]).length? e('div',{className:'min-table'},
        e('table',{className:'table'},[
          e('thead',null,e('tr',null,[
            e('th',null,'Timestamp'),
            e('th',null,'Route'),
            e('th',null,'Status'),
            e('th',null,'Duration ms'),
            e('th',null,'Device')
          ])),
          e('tbody',null,
            data.ops.map((row,idx)=>e('tr',{key:idx},[
              e('td',null,formatDate(row.ts)),
              e('td',null,row.route),
              e('td',null,row.status_code),
              e('td',null,row.duration_ms),
              e('td',null,row.device_id? e('a',{href:'/app/device?device='+encodeURIComponent(row.lookup),className:'link'},row.device_id):'—')
            ]))
          )
        ])
      ): e('div',{className:'empty'},'No recent operations in scope'),
      e('div',{className:'subdued',style:{marginTop:'.6rem'}},'Status mix: '+Object.entries(data.ops_summary||{}).map(([k,v])=>k+': '+v).join(' • ')||'n/a')
    ])
  ]);
}

function AdminArchivePage(){
  const [data,setData]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState(false);

  React.useEffect(()=>{
    api('/api/archive/offline').then(res=>{
      setData(res);
      setLoading(false);
    }).catch(()=>{
      setError(true);
      setLoading(false);
    });
  },[]);

  if(loading) return e(Page,{title:'Archive'}, e('div',{className:'card'},'Loading…'));
  if(error || !data) return e(Page,{title:'Archive'}, e('div',{className:'card callout error'},'Unable to load archive data'));

  return e(Page,{title:'Archive'},[
    e('div',{className:'card'},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Offline devices'),
        e('span',{className:'pill'},(data.offline||[]).length+' entries')
      ]),
      (data.offline||[]).length? e('div',{className:'stack'},
        data.offline.map((row,idx)=>e('div',{className:'list-item',key:row.lookup||idx},[
          e('div',null,[
            e('div',{style:{fontWeight:600}},row.device_id),
            row.site? e('div',{className:'subdued'},row.site):null,
            e('div',{className:'meta'},'Last heartbeat '+formatRelative(row.last_seen_at))
          ]),
          e('div',{style:{textAlign:'right'}},[
            e('div',{className:'meta'},'Alerts '+row.alerts),
            e('a',{href:'/app/device?device='+encodeURIComponent(row.lookup),className:'link'},'Open')
          ])
        ]))
      ): e('div',{className:'empty'},'No offline devices found')
    ]),
    e('div',{className:'card',style:{marginTop:'1rem'}},[
      e('div',{className:'card-header'},[
        e('div',{className:'card-title'},'Telemetry archive volume')
      ]),
      data.history && data.history.length? e('div',{className:'history-grid'},
        data.history.map((row,idx)=>e('div',{className:'history-card',key:idx},[
          e('strong',null,row.day),
          e('div',{className:'subdued'},formatNumber(row.samples||0,0)+' samples')
        ]))
      ): e('div',{className:'empty'},'No recent telemetry samples')
    ])
  ]);
}

function UnauthorizedPage(){
  return e('div',null,
    e('div',{className:'wrap'},
      e('div',{className:'card'},[
        e('h2',null,'No access'),
        e('p',null,'Your account is signed in but has no assigned role. Please contact support.'),
        e('div',{style:{marginTop:'1rem'}}, e('a',{href: RETURN_URL,className:'link'},'Back to GreenBro'))
      ])
    )
  );
}

function App(){
  const {me,err}=useMe();

  if (err) return e(UnauthorizedPage);
  if (!me) return e('div',null,e('div',{className:'wrap'}, e('div',{className:'card'}, 'Loading…')));

  const roles = me.roles || [];
  const path = location.pathname.replace(/^\/app\/?/,'') || '';
  const page = path.split('/')[0];

  if (path==='' || path==='index.html'){
    const landing = roles.includes('admin') ? '/app/overview'
      : roles.includes('client') ? '/app/compact'
      : roles.includes('contractor') ? '/app/devices'
      : '/app/unauthorized';
    if (location.pathname !== landing) { history.replaceState(null,'',landing); }
  }

  const content =
    page==='overview' ? e(OverviewPage,{me})
    : page==='compact' ? e(CompactDashboardPage)
    : page==='devices' ? e(DevicesPage)
    : page==='device' ? e(DeviceDetailPage)
    : page==='alerts' ? e(AlertsPage)
    : page==='commissioning' ? e(CommissioningPage)
    : page==='admin' ? e(AdminPage)
    : page==='admin-archive' ? e(AdminArchivePage)
    : page==='unauthorized' ? e(UnauthorizedPage)
    : e(OverviewPage,{me});

  return e('div',null, e(TopNav,{me}), content );
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

    if (path === "/") return Response.redirect(url.origin + "/app", 302);

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
      return Response.redirect(env.APP_BASE_URL + landingFor(user), 302);
    }

    // Logout route
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
    // Fleet summary
    if (path === "/api/fleet/summary" && req.method === "GET") {
      return handleFleetSummary(req, env);
    }
    if (path === "/api/client/compact" && req.method === "GET") {
      return handleClientCompact(req, env);
    }
    // NEW: list devices (tenant-scoped)
    if (path === "/api/devices" && req.method === "GET") {
      return handleListDevices(req, env);
    }
    if (path === "/api/alerts/recent" && req.method === "GET") {
      return handleAlertsFeed(req, env);
    }
    if (path === "/api/commissioning/checklist" && req.method === "GET") {
      return handleCommissioning(req, env);
    }
    if (path === "/api/admin/overview" && req.method === "GET") {
      return handleAdminOverview(req, env);
    }
    if (path === "/api/archive/offline" && req.method === "GET") {
      return handleArchive(req, env);
    }

    const latestMatch = path.match(/^\/api\/devices\/([^/]+)\/latest$/);
    if (latestMatch && req.method === "GET") {
      return handleLatest(req, env, decodeURIComponent(latestMatch[1]));
    }

    const historyMatch = path.match(/^\/api\/devices\/([^/]+)\/history$/);
    if (historyMatch && req.method === "GET") {
      return handleDeviceHistory(req, env, decodeURIComponent(historyMatch[1]));
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
    const thresholdSecs = Math.max(60, hbInterval * multiplier);
    const days = thresholdSecs / 86400;

    const stale = await env.DB.prepare(
      `SELECT device_id FROM devices
        WHERE online = 1
          AND (last_seen_at IS NULL OR (julianday('now') - julianday(last_seen_at)) > ?1)`
    ).bind(days).all<{ device_id: string }>();

    const ids = stale.results?.map(r => r.device_id) ?? [];
    if (!ids.length) return;

    const ts = new Date().toISOString();
    const BATCH = 25; // << keeps us under D1 50-statement limit

    for (const batchIds of chunk(ids, BATCH)) {
      // a) UPDATE devices … IN (…)
      const phA = batchIds.map((_, i) => `?${i + 1}`).join(",");
      await env.DB.prepare(
        `UPDATE devices SET online=0 WHERE online=1 AND device_id IN (${phA})`
      ).bind(...batchIds).run();

      // b) UPDATE latest_state … IN (…)
      const phB = batchIds.map((_, i) => `?${i + 2}`).join(",");
      await env.DB.prepare(
        `UPDATE latest_state SET online=0, updated_at=?1 WHERE device_id IN (${phB})`
      ).bind(ts, ...batchIds).run();

      // c) INSERT ops_metrics (multi-row)
      const values = batchIds.map(() => `(?, ?, ?, ?, ?)`).join(",");
      const binds: any[] = [];
      for (const id of batchIds) binds.push(ts, "/cron/offline", 200, 0, id);
      await env.DB.prepare(
        `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES ${values}`
      ).bind(...binds).run();
    }
  },
};
