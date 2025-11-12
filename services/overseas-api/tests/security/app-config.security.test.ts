import { describe, expect, it, vi } from "vitest";

import { resolveAppConfig, serializeAppConfig } from "../../src/app";
import type { Env } from "../../src/env";

describe("App config serialization safeguards", () => {
  const baseEnv = {
    RETURN_DEFAULT: "https://return.test/",
  } as unknown as Env;

  it("escapes characters that could break out of the injected script tag", () => {
    const env = {
      ...baseEnv,
      APP_API_BASE: "https://api.test/</script><img src=x onerror=alert(1)>",
      APP_ASSET_BASE: "<!--comment-->/bundle</script>",
    } as Env;

    const serialized = serializeAppConfig(resolveAppConfig(env));

    expect(serialized).not.toContain("</script>");
    expect(serialized).toMatch(/(\\u003C|%3C)\/script/);
    expect(serialized).toMatch(/(\\u003C|%3C)!?--comment/);
  });

  it("falls back to default bases when overrides are absent", () => {
    const config = resolveAppConfig(baseEnv);
    expect(config.apiBase).toBe("");
    expect(config.assetBase).toBe("/app/assets/");
    expect(config.returnDefault).toBe("https://return.test/");
  });

  it("rejects API bases with unsupported schemes and logs diagnostics", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const env = {
      ...baseEnv,
      APP_API_BASE: "javascript:alert(1)",
    } as Env;
    const config = resolveAppConfig(env);
    const messages = logSpy.mock.calls.map(([entry]) => String(entry));
    logSpy.mockRestore();
    expect(config.apiBase).toBe("");
    expect(messages.some((line) => line.includes("api_base_invalid_scheme"))).toBe(true);
  });

  it("preserves query strings and fragments on valid API bases", () => {
    const env = {
      ...baseEnv,
      APP_API_BASE: "https://api.example.com/v1?token=abc#frag",
    } as Env;
    const config = resolveAppConfig(env);
    expect(config.apiBase).toBe("https://api.example.com/v1?token=abc#frag");
  });

  it("normalizes custom asset bases to include a trailing slash", () => {
    const env = {
      ...baseEnv,
      APP_ASSET_BASE: "https://cdn.example.com/brand",
    } as Env;
    const config = resolveAppConfig(env);
    expect(config.assetBase).toBe("https://cdn.example.com/brand/");
  });

  it("preserves query strings and fragments on asset bases", () => {
    const env = {
      ...baseEnv,
      APP_ASSET_BASE: "https://cdn.example.com/brand?v=5#hash",
    } as Env;
    const config = resolveAppConfig(env);
    expect(config.assetBase).toBe("https://cdn.example.com/brand/?v=5#hash");
  });
});
