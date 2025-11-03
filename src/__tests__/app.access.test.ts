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
    APP_BASE_URL: "https://app.example.com/app",
    RETURN_DEFAULT: "/",
    CURSOR_SECRET: "cursor-secret-1234567890",
    INGEST_ALLOWED_ORIGINS: "https://devices.example.com",
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

  it("serves the SPA when a development user is allowed", async () => {
    const env = createEnv({
      APP_BASE_URL: "http://127.0.0.1:8787/app",
      DEV_ALLOW_USER: JSON.stringify({ email: "dev@example.com", roles: ["admin"] }),
      ALLOW_DEV_ACCESS_SHIM: "true",
    });
    const res = await app.fetch(new Request("https://example.com/app/overview"), env);

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("__APP_CONFIG__");
  });
});
