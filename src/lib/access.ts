import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { deriveUserFromClaims, landingFor } from "../rbac";
import type { Env, User } from "../env";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const devUserCache = new WeakMap<Env, { raw: string | null; user: User | null }>();
const DISABLED_TOKENS = new Set(["0", "false", "off", "no"]);
const ALLOWED_ROLES: ReadonlyArray<User["roles"][number]> = ["admin", "client", "contractor"];

export function getJwks(env: Env) {
  const url = env.ACCESS_JWKS_URL;
  if (!jwksCache.has(url)) {
    jwksCache.set(url, createRemoteJWKSet(new URL(url)));
  }
  return jwksCache.get(url)!;
}

function resolveDevUser(env: Env): User | null {
  const rawValue = typeof env.DEV_ALLOW_USER === "string" ? env.DEV_ALLOW_USER : null;
  const cached = devUserCache.get(env);
  if (cached && cached.raw === rawValue) {
    return cached.user;
  }

  if (!rawValue) {
    devUserCache.set(env, { raw: null, user: null });
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed || DISABLED_TOKENS.has(trimmed.toLowerCase())) {
    devUserCache.set(env, { raw: rawValue, user: null });
    return null;
  }

  let parsed: unknown = trimmed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // treat the raw string as an email below
  }

  let email = "dev@example.com";
  let roles: User["roles"] = ["admin"];
  let clientIds: string[] = [];

  if (typeof parsed === "string") {
    const candidate = parsed.trim();
    if (candidate) {
      email = candidate;
    }
  } else if (parsed && typeof parsed === "object") {
    const candidateEmail = (parsed as { email?: unknown }).email;
    if (typeof candidateEmail === "string" && candidateEmail.trim()) {
      email = candidateEmail.trim();
    }

    const candidateRoles = (parsed as { roles?: unknown }).roles;
    if (Array.isArray(candidateRoles)) {
      const normalized = candidateRoles
        .map((role) => (typeof role === "string" ? role.trim().toLowerCase() : ""))
        .filter((role) => role.length > 0);
      const filtered = normalized
        .map((role) => ALLOWED_ROLES.find((allowed) => allowed === role))
        .filter((role): role is User["roles"][number] => Boolean(role));
      if (filtered.length > 0) {
        roles = Array.from(new Set(filtered));
      }
    }

    const candidateClientIds = (parsed as { clientIds?: unknown }).clientIds;
    if (Array.isArray(candidateClientIds)) {
      const normalized = candidateClientIds
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter((id) => id.length > 0);
      if (normalized.length > 0) {
        clientIds = Array.from(new Set(normalized));
      }
    }
  } else {
    const candidate = String(parsed).trim();
    if (candidate) {
      email = candidate;
    }
  }

  const user: User = { email, roles, clientIds };
  devUserCache.set(env, { raw: rawValue, user });
  return user;
}

export async function requireAccessUser(req: Request, env: Env): Promise<User | null> {
  const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
  if (jwt) {
    try {
      const { payload } = await jwtVerify(jwt, getJwks(env), { audience: env.ACCESS_AUD });
      return deriveUserFromClaims(payload as JWTPayload);
    } catch {
      return null;
    }
  }

  return resolveDevUser(env);
}

export function userIsAdmin(user: User) {
  return user.roles?.includes("admin") ?? false;
}

export { landingFor };
