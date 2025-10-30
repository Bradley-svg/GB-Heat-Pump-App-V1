// src/rbac.ts
import type { JWTPayload } from "jose";
import type { AccessUser } from "./types";

/**
 * Canonical RBAC helpers.
 * - roles from roles[] or groups[]
 * - clientIds from explicit clientIds[] OR groups like "client:<id>"
 * SECURITY: Fail-closed. If no supported role is present, user gets no roles.
 */
export function deriveUserFromClaims(claims: JWTPayload): AccessUser {
  const email = (claims as any).email || claims.sub || "unknown@unknown";

  // Normalize potential role/group arrays to string[]
  const rawRolesArr: unknown[] = Array.isArray((claims as any).roles)
    ? (claims as any).roles
    : Array.isArray((claims as any).groups)
    ? (claims as any).groups
    : [];
  const rawRoles: string[] = rawRolesArr.map((r) => String(r));

  const roles = new Set<AccessUser["roles"][number]>();
  for (const r of rawRoles) {
    const v = r.toLowerCase();
    if (v.includes("admin")) roles.add("admin");
    else if (v.includes("contractor")) roles.add("contractor");
    else if (v.includes("client")) roles.add("client");
  }
  // ❌ no default grant — unknown users have zero roles

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

export function landingFor(user: AccessUser): string {
  if (user.roles.includes("admin")) return "/app/overview";
  if (user.roles.includes("client")) return "/app/compact";
  if (user.roles.includes("contractor")) return "/app/devices";
  // ❗ no roles => explicit unauthorized landing
  return "/app/unauthorized";
}
