import "../helpers/setup";

import { describe, expect, it } from "vitest";

import app from "../../src/app";
import { createWorkerEnv } from "../helpers/worker-env";

describe("Content-Security-Policy overrides", () => {
  it("includes configured API and asset origins in CSP directives", async () => {
    const { env, dispose } = await createWorkerEnv({
      APP_API_BASE: "https://api.remote.test/v1",
      APP_ASSET_BASE: "https://cdn.remote.test/app/assets?v=7#bundle",
    });

    try {
      const response = await app.fetch(new Request("https://example.com/app"), env);
      expect(response.status).toBe(200);

      const csp = response.headers.get("content-security-policy");
      expect(csp).toBeTypeOf("string");
      expect(csp).toMatch(/connect-src[^;]+https:\/\/api\.remote\.test/);
      expect(csp).toMatch(/connect-src[^;]+https:\/\/cdn\.remote\.test/);
      expect(csp).toMatch(/script-src[^;]+https:\/\/cdn\.remote\.test/);
      expect(csp).toMatch(/img-src[^;]+https:\/\/cdn\.remote\.test/);
      expect(csp).toMatch(/style-src[^;]+https:\/\/cdn\.remote\.test/);
      expect(csp).toMatch(/font-src[^;]+https:\/\/cdn\.remote\.test/);

      const html = await response.text();
      expect(html).toMatch(
        /href="https:\/\/cdn\.remote\.test\/app\/assets\/GREENBRO(?:%20| )LOGO(?:%20| )APP\.svg\?v=7#bundle"/,
      );
      expect(html).toMatch(/src="https:\/\/cdn\.remote\.test\/app\/assets\/[^"]+\.js\?v=7#bundle"/);
      expect(html).toMatch(/href="https:\/\/cdn\.remote\.test\/app\/assets\/[^"]+\.css\?v=7#bundle"/);
      expect(html).toContain('"assetBase":"https://cdn.remote.test/app/assets/?v=7#bundle"');
    } finally {
      dispose();
    }
  });
});
