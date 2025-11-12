import { afterAll, beforeEach, describe, expect, it } from "vitest";

import type { AppConfig } from "./config";
import { resolveReturnUrl } from "./config";

const ORIGIN = "https://app.test";
const BASE_CONFIG: AppConfig = {
  apiBase: "",
  assetBase: "/app/assets/",
  returnDefault: "/",
};

const originalLocation = window.location;

function setLocation(path: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL(`${ORIGIN}${path}`),
  });
}

describe("resolveReturnUrl", () => {
  beforeEach(() => {
    setLocation("/app/logout");
  });

  afterAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("falls back when the return parameter is absent", () => {
    setLocation("/app/logout");
    expect(resolveReturnUrl(BASE_CONFIG)).toBe("/");
  });

  it("accepts safe relative paths", () => {
    setLocation("/app/logout?return=/app/home");
    expect(resolveReturnUrl(BASE_CONFIG)).toBe("/app/home");
  });

  it("normalizes relative paths without leading slashes", () => {
    setLocation("/app/logout?return=app/home");
    expect(resolveReturnUrl(BASE_CONFIG)).toBe("/app/home");
  });

  it("allows same-origin absolute URLs", () => {
    setLocation("/app/logout?return=https%3A%2F%2Fapp.test%2Fapp%2Fdashboard");
    expect(resolveReturnUrl(BASE_CONFIG)).toBe("https://app.test/app/dashboard");
  });

  it("allows documented fallback origins", () => {
    const config: AppConfig = {
      ...BASE_CONFIG,
      returnDefault: "https://partners.test/app",
    };
    setLocation("/app/logout?return=https%3A%2F%2Fpartners.test%2Fapp%2Fwelcome");
    expect(resolveReturnUrl(config)).toBe("https://partners.test/app/welcome");
  });

  it("rejects protocol-relative URLs", () => {
    setLocation("/app/logout?return=%2F%2Fattacker.test%2Flanding");
    expect(resolveReturnUrl(BASE_CONFIG)).toBe("/");
  });

  it("rejects disallowed origins", () => {
    setLocation("/app/logout?return=https%3A%2F%2Fevil.test%2Ftakeover");
    expect(resolveReturnUrl(BASE_CONFIG)).toBe("/");
  });

  it("rejects unsafe schemes", () => {
    setLocation("/app/logout?return=javascript%3Aalert%281%29");
    expect(resolveReturnUrl(BASE_CONFIG)).toBe("/");
  });
});
