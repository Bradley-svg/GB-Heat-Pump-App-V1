// src/rbac.ts
import type { JWTPayload } from "jose";
import type { User } from "./env";

const ROLE_MAP: Record<string, User["roles"][number]> = {
  admin: "admin",
  contractor: "contractor",
  client: "client",
};

export function canonicalRole(candidate: string): User["roles"][number] | null {
  const normalized = candidate.trim().toLowerCase();
  if (!normalized) return null;
  return ROLE_MAP[normalized] ?? null;
}

/**
 * Canonical RBAC helpers.
 * - roles from roles[] or groups[]
 * - clientIds from explicit clientIds[] OR groups like "client:<id>"
 * SECURITY: Fail-closed. If no supported role is present, user gets no roles.
 */
export function deriveUserFromClaims(claims: JWTPayload): User {
  const email = (claims as any).email || claims.sub || "unknown@unknown";

  // Normalize potential role/group arrays to string[]
  const rawRolesArr: unknown[] = Array.isArray((claims as any).roles)
    ? (claims as any).roles
    : Array.isArray((claims as any).groups)
    ? (claims as any).groups
    : [];
  const rawRoles: string[] = rawRolesArr.map((r) => String(r));

  const roles = new Set<User["roles"][number]>();
  for (const r of rawRoles) {
    const canonical = canonicalRole(r);
    if (canonical) {
      roles.add(canonical);
    }
  }
  // No default grant - unknown users have zero roles

  // ---- clientIds
  const groupsUnknown: unknown[] = Array.isArray((claims as any).groups)
    ? (claims as any).groups
    : [];
  const groups: string[] = groupsUnknown.map((g) => String(g));

  const fromGroups: string[] = groups
    .filter((g: string) => g.startsWith("client:"))
    .map((g: string) => g.slice("client:".length));

  const claimIdsUnknown: unknown[] = Array.isArray((claims as any).clientIds)
    ? (claims as any).clientIds
    : [];
  const fromClaim: string[] = claimIdsUnknown.map((id) => String(id));

  const clientIds = Array.from(new Set<string>([...fromGroups, ...fromClaim]));

  return { email, roles: Array.from(roles), clientIds };
}

export function landingFor(user: User): string {
  if (user.roles.includes("admin")) return "/app/overview";
  if (user.roles.includes("client")) return "/app/compact";
  if (user.roles.includes("contractor")) return "/app/devices";
  // no roles => explicit unauthorized landing
  return "/app/unauthorized";
}
