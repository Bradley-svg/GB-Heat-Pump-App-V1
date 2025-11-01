import { describe, expect, it } from "vitest";

import { validateEnv, EnvValidationError, type Env } from "../env";

function createEnv(overrides: Partial<Env> = {}): Env {
  const base = {
    DB: {
      prepare: () => ({}),
    },
    ACCESS_JWKS_URL: "https://access.example.com/cdn-cgi/access/certs",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "https://app.example.com/app",
    RETURN_DEFAULT: "https://example.com/",
    CURSOR_SECRET: "integration-secret-12345",
  } satisfies Partial<Env>;
  return { ...base, ...overrides } as Env;
}

describe("validateEnv", () => {
  it("accepts a fully configured environment", () => {
    const env = createEnv();
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("accepts a safe relative return default", () => {
    const env = createEnv({ RETURN_DEFAULT: "/app/home" });
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("fails when the D1 binding is missing", () => {
    const env = createEnv({ DB: null as unknown as any });
    expect(() => validateEnv(env)).toThrowError(EnvValidationError);
  });

  it("fails when secrets are missing or malformed", () => {
    const env = createEnv({
      CURSOR_SECRET: "short",
      ACCESS_JWKS_URL: "not-a-url",
    });
    expect(() => validateEnv(env)).toThrowError(/ACCESS_JWKS_URL/);
  });

  it("fails when APP_BASE_URL is missing or malformed", () => {
    const env = createEnv({ APP_BASE_URL: "ftp://example.com/app" });
    expect(() => validateEnv(env)).toThrowError(/APP_BASE_URL/);
  });

  it("fails when RETURN_DEFAULT is unsafe or empty", () => {
    const env = createEnv({ RETURN_DEFAULT: "javascript:alert(1)" });
    expect(() => validateEnv(env)).toThrowError(/RETURN_DEFAULT/);
  });

  it("fails when APP_API_BASE uses a disallowed scheme", () => {
    const env = createEnv({ APP_API_BASE: "data:text/plain;base64,abc123" });
    expect(() => validateEnv(env)).toThrowError(/APP_API_BASE/);
  });

  it("fails when APP_ASSET_BASE uses a disallowed scheme", () => {
    const env = createEnv({ APP_ASSET_BASE: "file:///etc/passwd" });
    expect(() => validateEnv(env)).toThrowError(/APP_ASSET_BASE/);
  });
});
