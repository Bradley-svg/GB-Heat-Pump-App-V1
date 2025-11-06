import { describe, expect, it, vi } from "vitest";

import app from "../app";
import type { Env } from "../env";

function createEnv(overrides: Partial<Env> = {}): Env {
  const statement = {
    bind: vi.fn().mockReturnThis(),
    all: vi.fn(),
    run: vi.fn(),
  };
  const prepare = vi.fn().mockReturnValue(statement);
  return {
    DB: { prepare } as unknown as Env["DB"],
    ACCESS_JWKS_URL: "https://access.example.com/cdn-cgi/access/certs",
    ACCESS_AUD: "test-aud",
    APP_BASE_URL: "https://example.com/app",
    RETURN_DEFAULT: "/",
    CURSOR_SECRET: "cursor-secret-1234567890",
    INGEST_ALLOWED_ORIGINS: "https://devices.example.com",
    INGEST_RATE_LIMIT_PER_MIN: "120",
    INGEST_SIGNATURE_TOLERANCE_SECS: "300",
    INGEST_IP_LIMIT_PER_MIN: "0",
    INGEST_IP_BLOCK_SECONDS: "60",
    ENVIRONMENT: "test",
    ...overrides,
  } as Env;
}

describe("app.fetch access enforcement", () => {
  it("redirects unauthenticated app requests to Cloudflare Access", async () => {
    const env = createEnv();
    const res = await app.fetch(new Request("https://example.com/app"), env);

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "https://example.com/cdn-cgi/access/login/test-aud?redirect_url=https%3A%2F%2Fexample.com%2Fapp",
    );
  });

  it("normalizes Access redirects to the canonical app origin", async () => {
    const env = createEnv({ APP_BASE_URL: "https://app.example.com/app" });
    const res = await app.fetch(
      new Request("https://fallback.example.dev/app/overview?foo=1"),
      env,
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "https://app.example.com/cdn-cgi/access/login/test-aud?redirect_url=https%3A%2F%2Fapp.example.com%2Fapp%2Foverview%3Ffoo%3D1",
    );
  });

  it("serves the SPA when a development user is allowed", async () => {
    const env = createEnv({
      APP_BASE_URL: "http://127.0.0.1:8787/app",
      DEV_ALLOW_USER: JSON.stringify({ email: "dev@example.com", roles: ["admin"] }),
      ALLOW_DEV_ACCESS_SHIM: "true",
      ENVIRONMENT: "development",
    });
    const res = await app.fetch(new Request("https://example.com/app/overview"), env);

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("__APP_CONFIG__");
  });
});
