import "../helpers/setup";

import { describe, expect, it } from "vitest";

import app from "../../src/app";
import { createWorkerEnv } from "../helpers/worker-env";
import { createMockR2Bucket } from "../helpers/mock-r2";
import { encodeDevAllowUser } from "../helpers/dev-user";

describe("Content-Security-Policy overrides", () => {
  it("includes configured API and asset origins in CSP directives", async () => {
    const { env, dispose } = await createWorkerEnv({
      APP_BASE_URL: "http://127.0.0.1:8787/app",
      APP_API_BASE: "https://api.remote.test/v1",
      APP_ASSET_BASE: "https://cdn.remote.test/app/assets?v=7#bundle",
      ALLOW_DEV_ACCESS_SHIM: "true",
      ENVIRONMENT: "development",
      DEV_ALLOW_USER: encodeDevAllowUser({
        email: "admin.test@greenbro.io",
        roles: ["admin"],
        clientIds: ["profile-west"],
      }),
    });

    try {
      const response = await app.fetch(new Request("https://example.com/app/overview"), env);
      expect(response.status).toBe(200);

      const csp = response.headers.get("content-security-policy");
      expect(csp).toBeTypeOf("string");
      expect(csp).toMatch(/connect-src[^;]+https:\/\/api\.remote\.test/);
      expect(csp).toMatch(/connect-src[^;]+https:\/\/cdn\.remote\.test/);
      expect(csp).toMatch(/script-src[^;]+https:\/\/cdn\.remote\.test/);
      expect(csp).toMatch(/img-src[^;]+https:\/\/cdn\.remote\.test/);
      expect(csp).toMatch(/style-src[^;]+https:\/\/cdn\.remote\.test/);
      expect(csp).toMatch(/font-src[^;]+https:\/\/cdn\.remote\.test/);
      const permissionsPolicy = response.headers.get("permissions-policy");
      expect(permissionsPolicy).toBeTypeOf("string");
      expect(permissionsPolicy).toMatch(/camera=\(\)/);
      expect(permissionsPolicy).toMatch(/fullscreen=\(self\)/);

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

  it("applies security headers to R2 asset responses", async () => {
    const signingSecret = "integration-test-secret";
    const mockBucket = createMockR2Bucket();
    const { env, dispose } = await createWorkerEnv({
      GB_BUCKET: mockBucket.bucket,
      ASSET_SIGNING_SECRET: signingSecret,
    });

    try {
      await mockBucket.bucket.put("brand/logo.txt", "hello world", {
        httpMetadata: { contentType: "text/plain" },
      });

      const now = Math.floor(Date.now() / 1000);
      const exp = now + 120;
      const payload = `GET\nbrand/logo.txt\n${exp}`;
      const encoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(signingSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const mac = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
      const sig = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

      const url = `https://example.com/r2/brand/logo.txt?exp=${exp}&sig=${sig}`;
      const response = await app.fetch(new Request(url, { method: "GET" }), env);

      expect(response.status).toBe(200);
      const csp = response.headers.get("content-security-policy");
      expect(csp).toBeTypeOf("string");
      expect(csp).toMatch(/default-src 'self'/);
      expect(response.headers.get("strict-transport-security")).toBe(
        "max-age=31536000; includeSubDomains",
      );
      expect(response.headers.get("cross-origin-opener-policy")).toBe("same-origin");
      const permissionsPolicy = response.headers.get("permissions-policy");
      expect(permissionsPolicy).toMatch(/geolocation=\(\)/);
      expect(await response.text()).toBe("hello world");
    } finally {
      dispose();
    }
  });
});
