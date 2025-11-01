import { describe, expect, it } from "vitest";

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
    expect(serialized).toContain("\\u003C/script");
    expect(serialized).toContain("\\u003C!--comment");
  });

  it("falls back to default bases when overrides are absent", () => {
    const config = resolveAppConfig(baseEnv);
    expect(config.apiBase).toBe("");
    expect(config.assetBase).toBe("/app/assets/");
    expect(config.returnDefault).toBe("https://return.test/");
  });

  it("normalizes custom asset bases to include a trailing slash", () => {
    const env = {
      ...baseEnv,
      APP_ASSET_BASE: "https://cdn.example.com/brand",
    } as Env;
    const config = resolveAppConfig(env);
    expect(config.assetBase).toBe("https://cdn.example.com/brand/");
  });
});
