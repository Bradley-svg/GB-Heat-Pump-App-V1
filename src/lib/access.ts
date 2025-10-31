import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { deriveUserFromClaims, landingFor } from "../rbac";
import type { Env, User } from "../env";

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function getJwks(env: Env) {
  const url = env.ACCESS_JWKS_URL;
  if (!jwksCache.has(url)) {
    jwksCache.set(url, createRemoteJWKSet(new URL(url)));
  }
  return jwksCache.get(url)!;
}

export async function requireAccessUser(req: Request, env: Env): Promise<User | null> {
  const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, getJwks(env), { audience: env.ACCESS_AUD });
    return deriveUserFromClaims(payload as JWTPayload);
  } catch {
    return null;
  }
}

export function userIsAdmin(user: User) {
  return user.roles?.some((r: string) => r.toLowerCase().includes("admin")) ?? false;
}

export { landingFor };
