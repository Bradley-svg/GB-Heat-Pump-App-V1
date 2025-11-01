import { describe, expect, it } from "vitest";
import type { JWTPayload } from "jose";

import { canonicalRole, deriveUserFromClaims } from "../rbac";
import { userIsAdmin } from "../lib/access";

describe("RBAC canonical role matching", () => {
  const baseClaims: JWTPayload = { sub: "user-123" };

  it("emits canonical roles only when the exact role is present", () => {
    const claims = {
      ...baseClaims,
      roles: ["Admin", "client"],
    } as unknown as JWTPayload;

    const user = deriveUserFromClaims(claims);

    expect(user.roles).toContain("admin");
    expect(user.roles).toContain("client");
    expect(user.roles).toHaveLength(2);
  });

  it("does not elevate client-admin style substrings to admin", () => {
    const claims = {
      ...baseClaims,
      roles: ["client-admin"],
    } as unknown as JWTPayload;

    const user = deriveUserFromClaims(claims);

    expect(user.roles).not.toContain("admin");
    expect(user.roles).toHaveLength(0);
  });

  it("rejects unknown role aliases from groups", () => {
    const claims = {
      ...baseClaims,
      groups: ["client-admin", "client:profile-west"],
    } as unknown as JWTPayload;

    const user = deriveUserFromClaims(claims);

    expect(user.roles).toHaveLength(0);
    expect(user.clientIds).toContain("profile-west");
  });

  it("ignores malformed role strings when checking admin", () => {
    const weirdUser = {
      email: "test@example.com",
      roles: ["client-admin"] as unknown as Array<"admin" | "client" | "contractor">,
      clientIds: [],
    };

    expect(userIsAdmin(weirdUser as any)).toBe(false);
  });
});

describe("canonicalRole", () => {
  it("normalizes role strings", () => {
    expect(canonicalRole(" Admin ")).toBe("admin");
    expect(canonicalRole("CLIENT")).toBe("client");
    expect(canonicalRole("contractor")).toBe("contractor");
  });

  it("returns null for unsupported or mixed roles", () => {
    expect(canonicalRole("client-admin")).toBeNull();
    expect(canonicalRole("")).toBeNull();
    expect(canonicalRole("viewer")).toBeNull();
  });
});
