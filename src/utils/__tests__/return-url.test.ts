import { describe, expect, it } from "vitest";

import { resolveLogoutReturn } from "../return-url";
import type { Env } from "../../env";

const baseEnv = {
  APP_BASE_URL: "https://app.example.com/app",
  RETURN_DEFAULT: "/app",
} as unknown as Env;

describe("resolveLogoutReturn", () => {
  const requestUrl = new URL("https://worker.example.com/app/logout");

  it("returns fallback when no return parameter is provided", () => {
    expect(resolveLogoutReturn(null, baseEnv, requestUrl)).toBe("/app");
  });

  it("allows same-origin absolute URLs that match documented hosts", () => {
    const env = {
      ...baseEnv,
      RETURN_DEFAULT: "https://app.example.com/app/home",
    } as Env;
    const target = "https://app.example.com/app/dashboard";
    expect(resolveLogoutReturn(target, env, requestUrl)).toBe(target);
  });

  it("allows safe relative paths", () => {
    expect(resolveLogoutReturn("/app/overview", baseEnv, requestUrl)).toBe("/app/overview");
  });

  it("normalizes relative paths without a leading slash", () => {
    expect(resolveLogoutReturn("app/settings", baseEnv, requestUrl)).toBe("/app/settings");
  });

  it("rejects protocol-relative URLs", () => {
    expect(resolveLogoutReturn("//attacker.example.com", baseEnv, requestUrl)).toBe("/app");
  });

  it("rejects disallowed origins", () => {
    expect(resolveLogoutReturn("https://attacker.example.com/steal", baseEnv, requestUrl)).toBe("/app");
  });

  it("rejects unsafe schemes", () => {
    expect(resolveLogoutReturn("javascript:alert(1)", baseEnv, requestUrl)).toBe("/app");
  });
});
