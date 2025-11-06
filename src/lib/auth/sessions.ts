import { systemLogger } from "../../utils/logging";
import type { Env } from "../../env";

const SESSION_COOKIE = "gb_session";
const DEFAULT_SESSION_DAYS = 30;
const HASH_ALGO = "SHA-256";

export interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export interface SessionLookupResult {
  sessionId: string;
  userId: string;
  email: string;
  roles: string[];
  clientIds: string[];
  expiresAt: string;
}

export async function createSession(env: Env, userId: string): Promise<{ cookie: string; session: SessionRecord }> {
  const log = systemLogger({ scope: "auth" });
  const now = new Date();
  const expires = new Date(now.getTime() + DEFAULT_SESSION_DAYS * 86400 * 1000);
  const sessionId = crypto.randomUUID();
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const createdAt = now.toISOString();
  const expiresAt = expires.toISOString();

  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  )
    .bind(sessionId, userId, tokenHash, createdAt, expiresAt, createdAt)
    .run();

  log.info("auth.session.created", { user_id: userId, session_id: sessionId });

  const cookie = serializeSessionCookie(token, expiresAt, env);
  return {
    cookie,
    session: {
      id: sessionId,
      userId,
      token,
      createdAt,
      expiresAt,
    },
  };
}

export async function revokeSession(env: Env, token: string): Promise<void> {
  const tokenHash = await hashToken(token);
  await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?1`).bind(tokenHash).run();
}

export function clearSessionCookie(env: Env): string {
  const attrs = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
  const epoch = new Date(0);
  attrs.push(`Expires=${epoch.toUTCString()}`);
  const appUrl = safeUrl(env.APP_BASE_URL);
  const secure = appUrl ? appUrl.protocol === "https:" : true;
  if (secure) {
    attrs.push("Secure");
  }
  if (appUrl) {
    const domain = appUrl.hostname;
    if (domain && domain !== "localhost" && domain !== "127.0.0.1") {
      attrs.push(`Domain=${domain}`);
    }
  }
  return attrs.join("; ");
}

export function extractSessionToken(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(/; */);
  for (const part of parts) {
    const [name, value] = part.split("=");
    if (name === SESSION_COOKIE && value) {
      return value.trim();
    }
  }
  return null;
}

export async function lookupSession(env: Env, token: string): Promise<SessionLookupResult | null> {
  const tokenHash = await hashToken(token);
  const row = await env.DB.prepare(
    `SELECT s.id as session_id,
            s.user_id,
            s.expires_at,
            s.revoked_at,
            u.email,
            u.roles,
            u.client_ids
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1`,
  )
    .bind(tokenHash)
    .first<{
      session_id: string;
      user_id: string;
      expires_at: string;
      revoked_at: string | null;
      email: string;
      roles: string;
      client_ids: string | null;
    }>();

  if (!row) {
    return null;
  }

  if (row.revoked_at) {
    return null;
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?1`).bind(row.session_id).run();
    return null;
  }

  const roles = safeParseJsonArray(row.roles);
  const clientIds = safeParseJsonArray(row.client_ids);

  await env.DB.prepare(`UPDATE sessions SET last_seen_at = ?1 WHERE id = ?2`)
    .bind(new Date().toISOString(), row.session_id)
    .run();

  return {
    sessionId: row.session_id,
    userId: row.user_id,
    email: row.email,
    roles,
    clientIds,
    expiresAt: row.expires_at,
  };
}

export function serializeSessionCookie(token: string, expiresAt: string, env: Env): string {
  const attrs = [`${SESSION_COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Strict"];
  const appUrl = safeUrl(env.APP_BASE_URL);
  const secure = appUrl ? appUrl.protocol === "https:" : true;
  if (secure) {
    attrs.push("Secure");
  }

  const expires = new Date(expiresAt);
  attrs.push(`Expires=${expires.toUTCString()}`);
  const maxAge = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000));
  attrs.push(`Max-Age=${maxAge}`);

  if (appUrl) {
    const domain = appUrl.hostname;
    if (domain && domain !== "localhost" && domain !== "127.0.0.1") {
      attrs.push(`Domain=${domain}`);
    }
  }

  return attrs.join("; ");
}

export function generateToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest(HASH_ALGO, data);
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function safeParseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string");
    }
    return [];
  } catch {
    return [];
  }
}

function safeUrl(candidate: string | undefined | null): URL | null {
  if (!candidate) return null;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}
