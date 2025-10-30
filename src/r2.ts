// src/r2.ts — Secure R2 API (Access-gated writes + optional signed reads)
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

interface Env {
  GB_BUCKET: R2Bucket;
  ACCESS_JWKS_URL: string; // e.g. "https://<your-team>.cloudflareaccess.com/cdn-cgi/access/certs"
  ACCESS_AUD: string;      // your Access app AUD
  ASSET_SIGNING_SECRET?: string; // optional: enables signed GET/HEAD (?exp&sig)
  ALLOWED_PREFIXES?: string;     // optional: comma list like "brand/,public/"
}

const JSON_CT = "application/json;charset=utf-8";

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": JSON_CT },
    ...init,
  });
}

function badRequest(msg = "Bad Request")  { return json({ error: msg }, { status: 400 }); }
function unauthorized(msg = "Unauthorized"){ return json({ error: msg }, { status: 401 }); }
function forbidden(msg = "Forbidden")      { return json({ error: msg }, { status: 403 }); }
function notFound()                        { return json({ error: "Not found" }, { status: 404 }); }

function normalizeKey(pathname: string): string {
  let key = pathname.replace(/^\/+/, "");
  if (!key) throw new Error("empty_key");
  if (key.includes("..")) throw new Error("invalid_key");
  return key;
}

function parseAllowedPrefixes(env: Env): string[] | null {
  const s = env.ALLOWED_PREFIXES?.trim();
  if (!s) return null;
  return s.split(",").map(x => x.trim()).filter(Boolean).map(x => x.endsWith("/") ? x : x + "/");
}

function withinAllowedPrefixes(key: string, prefixes: string[] | null) {
  return !prefixes || prefixes.some(p => key.startsWith(p));
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function getJwks(env: Env) {
  const url = env.ACCESS_JWKS_URL;
  if (!jwksCache.has(url)) jwksCache.set(url, createRemoteJWKSet(new URL(url)));
  return jwksCache.get(url)!;
}

async function requireAccess(req: Request, env: Env): Promise<JWTPayload | null> {
  const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, getJwks(env), { audience: env.ACCESS_AUD });
    return payload;
  } catch {
    return null;
  }
}

function nowSec() { return Math.floor(Date.now() / 1000); }
function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Signed URL: ?exp=<unix_seconds>&sig=<hex(HMAC_SHA256(method+"\n"+key+"\n"+exp))>
async function verifySignedUrl(url: URL, method: string, env: Env): Promise<boolean> {
  const secret = env.ASSET_SIGNING_SECRET;
  if (!secret) return false;
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") || "";
  if (!Number.isFinite(exp) || exp < nowSec()) return false;

  let key: string;
  try { key = normalizeKey(url.pathname); } catch { return false; }

  const msg = `${method.toUpperCase()}\n${key}\n${exp}`;
  const te = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, te.encode(msg));
  const expected = hex(mac);
  return safeEq(expected, sig);
}

function withCors(res: Response) {
  const h = new Headers(res.headers);
  // Allow cross-origin consumption of signed GET/HEAD assets.
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Vary", "Origin");
  return new Response(res.body, { headers: h, status: res.status, statusText: res.statusText });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    let key: string;
    try { key = normalizeKey(url.pathname); }
    catch { return badRequest("Invalid object key"); }

    const method = req.method.toUpperCase();
    const prefixes = parseAllowedPrefixes(env);
    if (!withinAllowedPrefixes(key, prefixes)) {
      return forbidden("Key not allowed");
    }

    // AuthN
    const accessPayload = await requireAccess(req, env);           // Access SSO/Service Token (via Access)
    const hasAccess = !!accessPayload;
    const hasValidSignature = await verifySignedUrl(url, method, env); // for GET/HEAD only

    // Writes require Access
    if (method === "PUT") {
      if (!hasAccess) return unauthorized();
      const ct = req.headers.get("content-type") || undefined;
      try {
        await env.GB_BUCKET.put(key, req.body, { httpMetadata: { contentType: ct } });
        return json({ ok: true, key });
      } catch (e: any) {
        return json({ error: "Write failed", detail: String(e?.message || e) }, { status: 500 });
      }
    }

    if (method === "DELETE") {
      if (!hasAccess) return unauthorized();
      try {
        await env.GB_BUCKET.delete(key);
        return json({ ok: true, key, deleted: true });
      } catch (e: any) {
        return json({ error: "Delete failed", detail: String(e?.message || e) }, { status: 500 });
      }
    }

    // Reads require Access OR a valid signed URL
    if (method === "GET") {
      if (!hasAccess && !hasValidSignature) return unauthorized();
      const obj = await env.GB_BUCKET.get(key);
      if (!obj) return notFound();
      const headers = new Headers();
      if (obj.httpMetadata?.contentType) headers.set("content-type", obj.httpMetadata.contentType);
      if (obj.httpMetadata?.cacheControl) headers.set("cache-control", obj.httpMetadata.cacheControl);
      if (obj.etag) headers.set("etag", obj.etag);
      if (obj.uploaded) headers.set("last-modified", obj.uploaded.toUTCString());
      return withCors(new Response(obj.body, { headers }));
    }

    if (method === "HEAD") {
      if (!hasAccess && !hasValidSignature) return unauthorized();
      const obj = await env.GB_BUCKET.head(key);
      if (!obj) return notFound();
      const headers = new Headers();
      if (obj.httpMetadata?.contentType) headers.set("content-type", obj.httpMetadata.contentType);
      if (obj.httpMetadata?.cacheControl) headers.set("cache-control", obj.httpMetadata.cacheControl);
      if (obj.etag) headers.set("etag", obj.etag);
      if (obj.uploaded) headers.set("last-modified", obj.uploaded.toUTCString());
      headers.set("content-length", String(obj.size));
      return withCors(new Response(null, { headers }));
    }

    if (method === "OPTIONS") {
      const h = new Headers();
      h.set("Access-Control-Allow-Origin", "*");
      h.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
      h.set("Access-Control-Allow-Headers", "content-type");
      return new Response("", { status: 204, headers: h });
    }

    return json({ error: "Method not allowed" }, { status: 405, headers: { "Allow": "GET,HEAD,PUT,DELETE,OPTIONS" } });
  }
};
