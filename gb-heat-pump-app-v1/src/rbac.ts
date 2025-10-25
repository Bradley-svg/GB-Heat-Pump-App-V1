import { AccessUser, Role } from "./types";

export function deriveUserFromClaims(payload: any): AccessUser {
  const email: string = payload.email || payload.sub || "unknown@example.com";
  const rolesClaim = payload.roles || payload["https://greenbro.co.za/roles"] || [];
  const roles: Role[] = Array.isArray(rolesClaim)
    ? rolesClaim.filter((r: string) => r === "admin" || r === "client" || r === "contractor")
    : [];
  const clientIds: string[] =
    payload.clientIds || payload["https://greenbro.co.za/clientIds"] || [];
  return { email, roles, clientIds };
}

export function landingFor(roles: Role[]): string {
  if (roles.includes("admin")) return "/app/overview";
  if (roles.includes("client")) return "/app/compact";
  if (roles.includes("contractor")) return "/app/devices";
  return "/app/devices";
}
