import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readAppConfig, resolveReturnUrl } from "../app/config";

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<ReturnType<typeof readAppConfig>>;
  }
}

describe("readAppConfig returnDefault sanitization", () => {
  const originalConfig = window.__APP_CONFIG__;
  const originalUrl = window.location.href;

  beforeEach(() => {
    window.__APP_CONFIG__ = undefined;
    window.history.replaceState(null, "", "http://localhost/app/");
  });

  afterEach(() => {
    window.__APP_CONFIG__ = originalConfig;
    window.history.replaceState(null, "", originalUrl);
  });

  it("falls back to the default when returnDefault is cross-origin", () => {
    window.__APP_CONFIG__ = { returnDefault: "https://evil.example/phish" };
    const config = readAppConfig();
    expect(config.returnDefault).toBe("/");
  });

  it("preserves same-origin absolute returnDefault values", () => {
    window.__APP_CONFIG__ = { returnDefault: "http://localhost/success" };
    const config = readAppConfig();
    expect(config.returnDefault).toBe("http://localhost/success");
  });

  it("rejects cross-origin return query parameters", () => {
    window.__APP_CONFIG__ = { returnDefault: "/home" };
    const config = readAppConfig();
    window.history.replaceState(
      null,
      "",
      "http://localhost/app/?return=https%3A%2F%2Fevil.example%2Ftrap",
    );
    expect(resolveReturnUrl(config)).toBe("/home");
  });
});
