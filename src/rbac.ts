import type { AccessUser } from "./types";

// Simple role derivation + landings.
// Map roles from Access JWT claims: prefer `roles`, fallback to `groups`, else default to ["client"].
export function deriveUserFromClaims(claims: any): AccessUser {
  const email: string = claims.email || claims.sub || "unknown@unknown";
  const raw: string[] = Array.isArray(claims.roles)
    ? claims.roles
    : Array.isArray(claims.groups)
    ? claims.groups
    : [];

  const roles = new Set<AccessUser["roles"][number]>();
  for (const r of raw) {
    const v = String(r).toLowerCase();
    if (v.includes("admin")) roles.add("admin");
    else if (v.includes("contractor")) roles.add("contractor");
    else if (v.includes("client")) roles.add("client");
  }
  if (roles.size === 0) roles.add("client");

  // Optional client scoping via claim `clientIds`
  const clientIds: string[] = Array.isArray(claims.clientIds) ? claims.clientIds : [];

  return { email, roles: Array.from(roles), clientIds };
}

export function landingFor(user: AccessUser): string {
  if (user.roles.includes("admin")) return "/app/overview";
  if (user.roles.includes("client")) return "/app/compact";
  if (user.roles.includes("contractor")) return "/app/devices";
  return "/app/unauthorized";
}
