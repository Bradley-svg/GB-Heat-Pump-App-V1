// src/r2.ts - Secure R2 API (Access-gated writes + optional signed reads)
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import type { Env } from "./env";
import { json as secureJson, withSecurityHeaders } from "./utils/responses";

export interface R2HandlerOptions {
  /**
   * Route prefix (e.g. "/r2") stripped before object key evaluation.
   * Defaults to "" when running as a dedicated Worker.
   */
  routePrefix?: string;
}

const json = secureJson;

function badRequest(msg = "Bad Request") {
  return json({ error: msg }, { status: 400 });
}

function unauthorized(msg = "Unauthorized") {
  return json({ error: msg }, { status: 401 });
}

function forbidden(msg = "Forbidden") {
  return json({ error: msg }, { status: 403 });
}

function notFound() {
  return json({ error: "Not found" }, { status: 404 });
}

function normalizeKey(pathname: string): string {
  let key = pathname.replace(/^\/+/, "");
  if (!key) throw new Error("empty_key");
  if (key.split("/").some((segment) => segment === "..")) {
    throw new Error("invalid_key");
  }
  return key;
}

function parseAllowedPrefixes(env: Env): string[] | null {
  const raw = env.ALLOWED_PREFIXES?.trim();
  if (!raw) return null;
  const prefixes = new Set<string>();
  for (const token of raw.split(",").map((part) => part.trim()).filter(Boolean)) {
    const normalized = token.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!normalized) {
      // Treat a bare slash ("/" or "//") as allow-all.
      return null;
    }
    prefixes.add(`${normalized}/`);
  }
  return prefixes.size ? [...prefixes] : null;
}

function withinAllowedPrefixes(key: string, prefixes: string[] | null) {
  return !prefixes || prefixes.some((prefix) => key.startsWith(prefix));
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function getJwks(env: Env) {
  const url = env.ACCESS_JWKS_URL;
  if (!jwksCache.has(url)) {
    jwksCache.set(url, createRemoteJWKSet(new URL(url)));
  }
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

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Signed URL: ?exp=<unix_seconds>&sig=<hex(HMAC_SHA256(method+"\n"+key+"\n"+exp))>
async function verifySignedUrl(url: URL, method: string, env: Env): Promise<boolean> {
  const secret = env.ASSET_SIGNING_SECRET;
  if (!secret) return false;
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") || "";
  if (!Number.isFinite(exp) || exp < nowSec()) return false;

  let key: string;
  try {
    key = normalizeKey(url.pathname);
  } catch {
    return false;
  }

  const msg = `${method.toUpperCase()}\n${key}\n${exp}`;
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(msg));
  const expected = hex(mac);
  return safeEq(expected, sig);
}

function withCors(res: Response) {
  const headers = new Headers(res.headers);
  // Allow cross-origin consumption of signed GET/HEAD assets.
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Vary", "Origin");
  return withSecurityHeaders(
    new Response(res.body, {
      headers,
      status: res.status,
      statusText: res.statusText,
    }),
  );
}

function rewriteUrlForPrefix(original: URL, prefix: string | undefined): URL | null {
  if (!prefix) return new URL(original);
  const normalized = prefix.endsWith("/") && prefix !== "/" ? prefix.slice(0, -1) : prefix;
  if (!normalized.startsWith("/")) {
    throw new Error(`routePrefix must start with "/": ${prefix}`);
  }
  const path = original.pathname;
  if (path === normalized) {
    const clone = new URL(original);
    clone.pathname = "/";
    return clone;
  }
  if (path.startsWith(`${normalized}/`)) {
    const clone = new URL(original);
    clone.pathname = path.slice(normalized.length) || "/";
    return clone;
  }
  return null;
}

export async function handleR2Request(
  req: Request,
  env: Env,
  options: R2HandlerOptions = {},
): Promise<Response> {
  const bucket = env.GB_BUCKET;
  if (!bucket) {
    return json({ error: "R2 bucket not configured" }, { status: 503 });
  }

  const rewrittenUrl = rewriteUrlForPrefix(new URL(req.url), options.routePrefix);
  if (!rewrittenUrl) {
    return notFound();
  }

  let key: string;
  try {
    key = normalizeKey(rewrittenUrl.pathname);
  } catch {
    return badRequest("Invalid object key");
  }

  const method = req.method.toUpperCase();
  const prefixes = parseAllowedPrefixes(env);
  if (!withinAllowedPrefixes(key, prefixes)) {
    return forbidden("Key not allowed");
  }

  const accessPayload = await requireAccess(req, env);
  const hasAccess = !!accessPayload;
  const hasValidSignature = await verifySignedUrl(rewrittenUrl, method, env);

  if (method === "PUT") {
    if (!hasAccess) return unauthorized();
    const contentType = req.headers.get("content-type") || undefined;
    try {
      await bucket.put(key, req.body, { httpMetadata: { contentType } });
      return json({ ok: true, key });
    } catch (error: unknown) {
      return json(
        { error: "Write failed", detail: String((error as Error | undefined)?.message ?? error) },
        { status: 500 },
      );
    }
  }

  if (method === "DELETE") {
    if (!hasAccess) return unauthorized();
    try {
      await bucket.delete(key);
      return json({ ok: true, key, deleted: true });
    } catch (error: unknown) {
      return json(
        { error: "Delete failed", detail: String((error as Error | undefined)?.message ?? error) },
        { status: 500 },
      );
    }
  }

  if (method === "GET") {
    if (!hasAccess && !hasValidSignature) return unauthorized();
    const obj = await bucket.get(key);
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
    const obj = await bucket.head(key);
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
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET,HEAD,PUT,DELETE,OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "content-type,Cf-Access-Jwt-Assertion,Cf-Access-Client-Id,Cf-Access-Client-Secret",
    );
    headers.set("Access-Control-Max-Age", "600");
    return withSecurityHeaders(new Response(null, { status: 204, headers }));
  }

  return json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "GET,HEAD,PUT,DELETE,OPTIONS" } },
  );
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    return handleR2Request(req, env);
  },
};
