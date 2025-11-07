import { z } from "zod";

import type { Env } from "../env";
import { json } from "../utils/responses";
import { loggerForRequest } from "../utils/logging";
import type { Logger } from "../utils/logging";
import { nowISO } from "../utils";
import {
  hashPassword,
  serializePasswordHash,
  verifyPassword,
  deserializePasswordHash,
} from "../lib/auth/password";
import {
  createSession,
  revokeSession,
  extractSessionToken,
  clearSessionCookie,
  generateToken,
  hashToken,
} from "../lib/auth/sessions";
import { checkIpRateLimit } from "../lib/ip-rate-limit";
import { sendPasswordResetNotification } from "../lib/notifications/password-reset";

const EMAIL_ALREADY_REGISTERED = "Email is already registered";
const INVALID_CREDENTIALS = "Invalid email or password";
const DEFAULT_ROLE = "client";
const PASSWORD_RESET_TTL_MINUTES = 60;
const MIN_PASSWORD_LENGTH = 8;
const ALLOWED_ROLES = new Set(["admin", "client", "contractor"]);
const PASSWORD_RESET_UNAVAILABLE = "Password recovery is temporarily unavailable";
const PASSWORD_RESET_DELIVERY_FAILED = "Unable to deliver reset instructions";

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().min(1).optional(),
  company: z.string().trim().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

const recoverSchema = z.object({
  email: z.string().trim().email(),
});

const resetSchema = z.object({
  token: z.string().trim().min(10),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

export async function handleSignup(req: Request, env: Env) {
  const log = loggerForRequest(req, { scope: "auth.signup" });
  const limited = await enforceAuthRateLimit(req, env, "/api/auth/signup", log);
  if (limited) return limited;
  const body = await readJson(req);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return json(validationError(parsed.error), { status: 400 });
  }

  const input = parsed.data;
  const email = input.email.toLowerCase();
  const existing = await env.DB.prepare(`SELECT id FROM users WHERE email = ?1`).bind(email).first();
  if (existing) {
    log.warn("auth.signup.email_exists", { email: maskEmail(email) });
    return json({ ok: true }, { status: 202 });
  }

  const iterations = resolvePasswordIterations(env);
  const passwordRecord = await hashPassword(input.password, { iterations });
  const serialized = serializePasswordHash(passwordRecord);
  const userId = crypto.randomUUID();
  const now = nowISO();
  const roles = JSON.stringify([DEFAULT_ROLE]);
  const clientIds = JSON.stringify([]);
  const metadata = JSON.stringify({
    source: "signup",
    captured_at: now,
  });

  await env.DB.batch([
    env.DB
      .prepare(
        `INSERT INTO users (
            id, email, password_hash, password_salt, password_iters,
            roles, client_ids, profile_id, created_at, updated_at, verified_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8, ?8, NULL)`,
      )
      .bind(
        userId,
        email,
        serialized.hash,
        serialized.salt,
        serialized.iterations,
        roles,
        clientIds,
        now,
      ),
    env.DB
      .prepare(
        `INSERT INTO user_profiles (
            user_id, first_name, last_name, phone, company, metadata
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      )
      .bind(
        userId,
        input.firstName,
        input.lastName,
        nullable(input.phone),
        nullable(input.company),
        metadata,
      ),
  ]);

  log.info("auth.signup.success", { user_id: userId, email: maskEmail(email) });

  const { cookie } = await createSession(env, userId);
  return json({ ok: true }, { status: 202, headers: { "Set-Cookie": cookie } });
}

export async function handleLogin(req: Request, env: Env) {
  const log = loggerForRequest(req, { scope: "auth.login" });
  const limited = await enforceAuthRateLimit(req, env, "/api/auth/login", log);
  if (limited) return limited;
  const body = await readJson(req);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return json(validationError(parsed.error), { status: 400 });
  }

  const input = parsed.data;
  const email = input.email.toLowerCase();
  const userRow = await env.DB
    .prepare(
      `SELECT
          users.id AS id,
          users.password_hash AS password_hash,
          users.password_salt AS password_salt,
          users.password_iters AS password_iters,
          users.roles AS roles,
          users.client_ids AS client_ids,
          user_profiles.first_name AS first_name,
          user_profiles.last_name AS last_name
        FROM users
        LEFT JOIN user_profiles ON user_profiles.user_id = users.id
       WHERE users.email = ?1`,
    )
    .bind(email)
    .first<DbUserRow>();

  if (!userRow) {
    log.warn("auth.login.unknown_email", { email: maskEmail(email) });
    return json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const passwordHash = deserializePasswordHash({
    hash: userRow.password_hash,
    salt: userRow.password_salt,
    iterations: Number(userRow.password_iters),
  });

  const passwordOk = await verifyPassword(input.password, passwordHash);
  if (!passwordOk) {
    log.warn("auth.login.invalid_password", { user_id: userRow.id });
    return json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const { cookie, session } = await createSession(env, userRow.id);
  log.info("auth.login.success", { user_id: userRow.id, session_id: session.id });

  return json(
    {
      user: {
        email,
        roles: parseStoredRoles(userRow.roles),
        clientIds: parseStoredClientIds(userRow.client_ids),
        firstName: userRow.first_name ?? null,
        lastName: userRow.last_name ?? null,
        sessionExpiresAt: session.expiresAt,
      },
    },
    { headers: { "Set-Cookie": cookie } },
  );
}

export async function handleLogout(req: Request, env: Env) {
  const token = extractSessionToken(req);
  if (token) {
    await revokeSession(env, token);
  }
  const cookie = clearSessionCookie(env);
  return json({ ok: true }, { headers: { "Set-Cookie": cookie } });
}

export async function handleRecover(req: Request, env: Env) {
  const log = loggerForRequest(req, { scope: "auth.recover" });
  const limited = await enforceAuthRateLimit(req, env, "/api/auth/recover", log);
  if (limited) return limited;
  const webhookConfigured = typeof env.PASSWORD_RESET_WEBHOOK_URL === "string"
    && env.PASSWORD_RESET_WEBHOOK_URL.trim().length > 0;
  if (!webhookConfigured) {
    log.warn("auth.password_reset.disabled", { reason: "webhook_not_configured" });
    return json({ error: PASSWORD_RESET_UNAVAILABLE }, { status: 503 });
  }
  const body = await readJson(req);
  const parsed = recoverSchema.safeParse(body);
  if (!parsed.success) {
    return json(validationError(parsed.error), { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await env.DB.prepare(`SELECT id FROM users WHERE email = ?1`).bind(email).first<{ id: string }>();
  if (!user) {
    // Do not leak account existence
    return json({ ok: true });
  }

  const now = new Date();
  const expires = new Date(now.getTime() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
  const token = generateToken(48);
  const tokenHash = await hashToken(token);
  const createdAt = now.toISOString();
  const expiresAt = expires.toISOString();

  await env.DB.prepare(`DELETE FROM password_resets WHERE user_id = ?1`).bind(user.id).run();

  const resetUrl = buildResetUrl(env, token);

  try {
    await sendPasswordResetNotification(env, {
      email,
      resetUrl,
      expiresAt,
    });
  } catch (error) {
    log.error("auth.password_reset.notify_failed", {
      user_id: user.id,
      email: maskEmail(email),
      error,
    });
    return json({ error: PASSWORD_RESET_DELIVERY_FAILED }, { status: 502 });
  }

  await env.DB
    .prepare(
      `INSERT INTO password_resets (token_hash, user_id, created_at, expires_at, used_at)
       VALUES (?1, ?2, ?3, ?4, NULL)`,
    )
    .bind(tokenHash, user.id, createdAt, expiresAt)
    .run();

  log.info("auth.password_reset.issued", {
    user_id: user.id,
    email: maskEmail(email),
    reset_token_hash: tokenHash,
  });

  return json({ ok: true });
}

export async function handleReset(req: Request, env: Env) {
  const log = loggerForRequest(req, { scope: "auth.reset" });
  const limited = await enforceAuthRateLimit(req, env, "/api/auth/reset", log);
  if (limited) return limited;
  const body = await readJson(req);
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return json(validationError(parsed.error), { status: 400 });
  }

  const { token, password } = parsed.data;
  const tokenHash = await hashToken(token);
  const resetRow = await env.DB
    .prepare(
      `SELECT token_hash, user_id, expires_at, used_at
         FROM password_resets
        WHERE token_hash = ?1`,
    )
    .bind(tokenHash)
    .first<{ token_hash: string; user_id: string; expires_at: string; used_at: string | null }>();

  if (!resetRow || resetRow.used_at || new Date(resetRow.expires_at).getTime() <= Date.now()) {
    return json({ error: "Reset token is invalid or has expired" }, { status: 400 });
  }

  const iterations = resolvePasswordIterations(env);
  const passwordRecord = await hashPassword(password, { iterations });
  const serialized = serializePasswordHash(passwordRecord);
  const now = nowISO();

  await env.DB.batch([
    env.DB
      .prepare(
        `UPDATE users
            SET password_hash = ?1,
                password_salt = ?2,
                password_iters = ?3,
                updated_at = ?4
          WHERE id = ?5`,
      )
      .bind(serialized.hash, serialized.salt, serialized.iterations, now, resetRow.user_id),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1`).bind(resetRow.user_id),
    env.DB
      .prepare(`UPDATE password_resets SET used_at = ?1 WHERE token_hash = ?2`)
      .bind(now, resetRow.token_hash),
  ]);

  const { cookie, session } = await createSession(env, resetRow.user_id);
  log.info("auth.password_reset.completed", { user_id: resetRow.user_id, session_id: session.id });

  return json(
    { ok: true, sessionExpiresAt: session.expiresAt },
    { headers: { "Set-Cookie": cookie } },
  );
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function validationError(error: z.ZodError) {
  return {
    error: "Validation failed",
    details: error.issues.map((issue) => ({
      path: issue.path.join(".") || "root",
      message: issue.message,
    })),
  };
}

function nullable<T>(value: T | undefined): T | null {
  return value && `${value}`.trim().length > 0 ? value : null;
}

function resolvePasswordIterations(env: Env): number {
  const raw = typeof env.PASSWORD_PBKDF2_ITERATIONS === "string" ? env.PASSWORD_PBKDF2_ITERATIONS.trim() : "";
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed >= 50000 && parsed <= 500000) {
    return parsed;
  }
  return 100_000;
}

function buildResetUrl(env: Env, token: string): string {
  const base = safeUrl(env.APP_BASE_URL);
  if (!base) {
    return `/auth/reset?token=${encodeURIComponent(token)}`;
  }
  base.pathname = "/auth/reset";
  base.search = `token=${encodeURIComponent(token)}`;
  base.hash = "";
  return base.toString();
}

function safeUrl(candidate: string | undefined): URL | null {
  if (!candidate) return null;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

type DbUserRow = {
  id: string;
  password_hash: string;
  password_salt: string;
  password_iters: number | string;
  roles: string;
  client_ids: string | null;
  first_name: string | null;
  last_name: string | null;
};

function parseStoredRoles(value: string): string[] {
  return parseJsonArray(value)
    .map((role) => role.trim().toLowerCase())
    .filter((role) => ALLOWED_ROLES.has(role));
}

function parseStoredClientIds(value: string | null): string[] {
  return parseJsonArray(value)
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function enforceAuthRateLimit(
  req: Request,
  env: Env,
  route: string,
  log: Logger,
): Promise<Response | null> {
  const result = await checkIpRateLimit(req, env, route, {
    limitEnvKey: "AUTH_IP_LIMIT_PER_MIN",
    blockEnvKey: "AUTH_IP_BLOCK_SECONDS",
    kvBindingKey: "AUTH_IP_BUCKETS",
    defaultLimit: 25,
    defaultBlockSeconds: 300,
  });
  if (result?.limited) {
    const response = json({ error: "Too many attempts" }, { status: 429 });
    if (result.retryAfterSeconds != null) {
      response.headers.set("Retry-After", String(result.retryAfterSeconds));
    }
    const fields: Record<string, unknown> = {
      route,
      limit_per_minute: result.limit ?? null,
      retry_after_seconds: result.retryAfterSeconds ?? null,
    };
    if (result.ip) {
      fields.client_ip = result.ip;
    }
    log.warn("auth.rate_limited", fields);
    return response;
  }
  return null;
}

function maskEmail(email: string): string {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed) return "***";
  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return "***";
  }
  const [local, domain] = parts;
  if (!domain) {
    return "***";
  }
  if (!local) {
    return `*@${domain}`;
  }
  if (local.length === 1) {
    return `*@${domain}`;
  }
  if (local.length === 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}***${local.slice(-1)}@${domain}`;
}
