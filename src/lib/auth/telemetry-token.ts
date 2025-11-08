import { SignJWT, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

import type { Env, User } from "../../env";
import { loggerForRequest } from "../../utils/logging";

const encoder = new TextEncoder();
const secretCache = new WeakMap<Env, Uint8Array>();

const TELEMETRY_SCOPE = "client-events";
const TELEMETRY_AUDIENCE = "client-events";
const TELEMETRY_ISSUER = "gb-worker-auth";
const MIN_TTL_SECONDS = 60;
const DEFAULT_TTL_SECONDS = 900;
const MAX_TTL_SECONDS = 86_400;

const ALLOWED_ROLES: ReadonlyArray<User["roles"][number]> = ["admin", "client", "contractor"];

export type TelemetryGrant = {
  token: string;
  expiresAt: string;
};

type TelemetryClaims = {
  email: string;
  roles: string[];
  clientIds: string[];
};

export async function issueTelemetryToken(env: Env, claims: TelemetryClaims): Promise<TelemetryGrant> {
  const ttlSeconds = resolveTelemetryTtlSeconds(env);
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = issuedAtSeconds + ttlSeconds;
  const payload = {
    scope: TELEMETRY_SCOPE,
    email: claims.email,
    roles: sanitizeRoles(claims.roles),
    client_ids: sanitizeClientIds(claims.clientIds),
  };
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.email)
    .setIssuer(TELEMETRY_ISSUER)
    .setAudience(TELEMETRY_AUDIENCE)
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(expiresAtSeconds)
    .sign(getSecretKey(env));

  return {
    token,
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
  };
}

export async function authenticateTelemetryRequest(req: Request, env: Env): Promise<User | null> {
  const token = extractTelemetryToken(req);
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey(env), {
      issuer: TELEMETRY_ISSUER,
      audience: TELEMETRY_AUDIENCE,
    });
    if (payload.scope !== TELEMETRY_SCOPE) {
      return null;
    }
    const email = resolveEmailFromPayload(payload);
    if (!email) {
      return null;
    }
    const roles = sanitizeRoles(payload.roles);
    const clientIds = sanitizeClientIds(
      (payload as JWTPayload & { client_ids?: unknown; clientIds?: unknown }).client_ids ??
        (payload as { clientIds?: unknown }).clientIds,
    );
    return {
      email,
      roles,
      clientIds,
    };
  } catch (error) {
    loggerForRequest(req, { scope: "telemetry.auth" }).warn("telemetry.token.invalid", {
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    return null;
  }
}

function extractTelemetryToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) {
      const candidate = match[1]!.trim();
      if (candidate.length > 0) {
        return candidate;
      }
    }
  }
  const fallbackHeader = req.headers.get("x-telemetry-token");
  if (fallbackHeader?.trim()) {
    return fallbackHeader.trim();
  }
  return null;
}

function resolveEmailFromPayload(payload: JWTPayload): string | null {
  if (typeof payload.email === "string" && payload.email.trim().length > 0) {
    return payload.email.trim().toLowerCase();
  }
  if (typeof payload.sub === "string" && payload.sub.trim().length > 0) {
    return payload.sub.trim().toLowerCase();
  }
  return null;
}

function getSecretKey(env: Env): Uint8Array {
  const cached = secretCache.get(env);
  if (cached) {
    return cached;
  }
  const secret = env.CLIENT_EVENT_TOKEN_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error("CLIENT_EVENT_TOKEN_SECRET must be configured");
  }
  const encoded = encoder.encode(secret.trim());
  secretCache.set(env, encoded);
  return encoded;
}

function resolveTelemetryTtlSeconds(env: Env): number {
  const raw =
    typeof env.CLIENT_EVENT_TOKEN_TTL_SECONDS === "string" ? env.CLIENT_EVENT_TOKEN_TTL_SECONDS.trim() : "";
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed >= MIN_TTL_SECONDS && parsed <= MAX_TTL_SECONDS) {
    return parsed;
  }
  return DEFAULT_TTL_SECONDS;
}

function sanitizeRoles(input: unknown): User["roles"] {
  if (!Array.isArray(input)) {
    return [];
  }
  const normalized = input
    .map((role) => (typeof role === "string" ? role.trim().toLowerCase() : ""))
    .filter((role) => role.length > 0);
  const filtered = normalized.filter((role): role is User["roles"][number] =>
    ALLOWED_ROLES.includes(role as User["roles"][number]),
  );
  return Array.from(new Set(filtered));
}

function sanitizeClientIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

