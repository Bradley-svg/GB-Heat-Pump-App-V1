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
});
