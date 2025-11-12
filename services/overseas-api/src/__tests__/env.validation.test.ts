import type { D1PreparedStatement } from "@cloudflare/workers-types";
import { describe, expect, it } from "vitest";

import { validateEnv, EnvValidationError, type Env } from "../env";
import { createTestKvNamespace } from "../../tests/helpers/kv";

function createEnv(overrides: Partial<Env> = {}): Env {
  const preparedStatement = {
    bind: () => preparedStatement,
    first: async () => null,
    run: async () => ({ results: [], success: true, meta: { duration: 0 } }),
    all: async () => ({ results: [] }),
    raw: async () => [],
  } as unknown as D1PreparedStatement;
  const base = {
    DB: {
      prepare: () => preparedStatement,
      batch: async () => [],
    } as unknown as Env["DB"],
    ACCESS_JWKS_URL: "https://access.example.com/cdn-cgi/access/certs",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "https://app.example.com/app",
    RETURN_DEFAULT: "https://example.com/",
    CURSOR_SECRET: "integration-secret-12345",
    INGEST_ALLOWED_ORIGINS: "https://devices.example.com",
    INGEST_RATE_LIMIT_PER_MIN: "120",
    INGEST_SIGNATURE_TOLERANCE_SECS: "300",
    ENVIRONMENT: "test",
    INGEST_IP_BUCKETS: createTestKvNamespace(),
    AUTH_IP_BUCKETS: createTestKvNamespace(),
    CLIENT_EVENT_LIMIT_PER_MIN: "0",
    CLIENT_EVENT_BLOCK_SECONDS: "60",
    CLIENT_EVENT_IP_BUCKETS: createTestKvNamespace(),
    PASSWORD_RESET_WEBHOOK_URL: "https://hooks.test/password-reset",
    PASSWORD_RESET_WEBHOOK_SECRET: "dev-reset-secret",
    EMAIL_VERIFICATION_WEBHOOK_URL: "https://hooks.test/email-verification",
    EMAIL_VERIFICATION_WEBHOOK_SECRET: "dev-email-secret",
    CLIENT_EVENT_TOKEN_SECRET: "test-telemetry-token-secret-rotate-1234567890",
    CLIENT_EVENT_TOKEN_TTL_SECONDS: "900",
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

  it("fails when INGEST_ALLOWED_ORIGINS is missing in non-local environments", () => {
    const env = createEnv();
    delete (env as any).INGEST_ALLOWED_ORIGINS;
    expect(() => validateEnv(env)).toThrowError(/INGEST_ALLOWED_ORIGINS/);
  });

  it("allows missing INGEST_ALLOWED_ORIGINS for local development", () => {
    const env = createEnv({
      APP_BASE_URL: "http://localhost:8787/app",
      RETURN_DEFAULT: "/app",
    });
    delete (env as any).INGEST_ALLOWED_ORIGINS;
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("fails when ALLOW_DEV_ACCESS_SHIM is enabled for non-local APP_BASE_URL", () => {
    const env = createEnv({ ALLOW_DEV_ACCESS_SHIM: "true" });
    expect(() => validateEnv(env)).toThrowError(/ALLOW_DEV_ACCESS_SHIM/);
  });

  it("fails when ALLOW_DEV_ACCESS_SHIM is enabled without an allowed ENVIRONMENT", () => {
    const env = createEnv({
      ALLOW_DEV_ACCESS_SHIM: "true",
      ENVIRONMENT: "production",
      APP_BASE_URL: "http://127.0.0.1:8787/app",
    });
    expect(() => validateEnv(env)).toThrowError(/ALLOW_DEV_ACCESS_SHIM/);
  });

  it("allows ALLOW_DEV_ACCESS_SHIM when APP_BASE_URL points to localhost", () => {
    const env = createEnv({
      APP_BASE_URL: "http://127.0.0.1:8787/app",
      ALLOW_DEV_ACCESS_SHIM: "true",
      DEV_ALLOW_USER: JSON.stringify({ email: "local@example.com", roles: ["admin"] }),
      ENVIRONMENT: "development",
    });
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("fails when ALLOW_RAW_INGEST is enabled outside local/test environments", () => {
    const env = createEnv({ ALLOW_RAW_INGEST: "true" });
    expect(() => validateEnv(env)).toThrowError(/ALLOW_RAW_INGEST/);
  });

  it("allows ALLOW_RAW_INGEST only when ENVIRONMENT and APP_BASE_URL are local", () => {
    const env = createEnv({
      APP_BASE_URL: "http://127.0.0.1:8787/app",
      ENVIRONMENT: "development",
      ALLOW_RAW_INGEST: "true",
    });
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("allows configuring ingest IP rate limit when values are valid", () => {
    const env = createEnv({
      INGEST_IP_LIMIT_PER_MIN: "120",
      INGEST_IP_BLOCK_SECONDS: "30",
    });
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("fails when ingest IP rate limiting is enabled without a KV binding", () => {
    const env = createEnv({
      INGEST_IP_LIMIT_PER_MIN: "60",
    });
    delete (env as any).INGEST_IP_BUCKETS;
    expect(() => validateEnv(env)).toThrowError(/INGEST_IP_BUCKETS/);
  });

  it("fails when auth IP rate limiting is enabled without a KV binding", () => {
    const env = createEnv({
      AUTH_IP_LIMIT_PER_MIN: "25",
    });
    delete (env as any).AUTH_IP_BUCKETS;
    expect(() => validateEnv(env)).toThrowError(/AUTH_IP_BUCKETS/);
  });

  it("accepts auth IP rate limiting when the KV binding is present", () => {
    const env = createEnv({
      AUTH_IP_LIMIT_PER_MIN: "25",
      AUTH_IP_BUCKETS: createTestKvNamespace(),
    });
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("allows missing INGEST_IP_BUCKETS when running locally", () => {
    const env = createEnv({
      APP_BASE_URL: "http://127.0.0.1:8787/app",
      ENVIRONMENT: "development",
      INGEST_IP_LIMIT_PER_MIN: "10",
    });
    delete (env as any).INGEST_IP_BUCKETS;
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("allows disabling ingest IP rate limit with zero", () => {
    const env = createEnv({
      INGEST_IP_LIMIT_PER_MIN: "0",
    });
    expect(() => validateEnv(env)).not.toThrow();
  });

  it("fails when ingest IP rate limit is invalid", () => {
    const env = createEnv({
      INGEST_IP_LIMIT_PER_MIN: "-1",
    });
    expect(() => validateEnv(env)).toThrowError(/INGEST_IP_LIMIT_PER_MIN/);
  });

  it("fails when INGEST_RATE_LIMIT_PER_MIN is missing or invalid", () => {
    const missing = createEnv();
    delete (missing as any).INGEST_RATE_LIMIT_PER_MIN;
    expect(() => validateEnv(missing)).toThrowError(/INGEST_RATE_LIMIT_PER_MIN/);

    const invalid = createEnv({ INGEST_RATE_LIMIT_PER_MIN: "0" });
    expect(() => validateEnv(invalid)).toThrowError(/INGEST_RATE_LIMIT_PER_MIN/);
  });

  it("fails when INGEST_SIGNATURE_TOLERANCE_SECS is missing or invalid", () => {
    const missing = createEnv();
    delete (missing as any).INGEST_SIGNATURE_TOLERANCE_SECS;
    expect(() => validateEnv(missing)).toThrowError(/INGEST_SIGNATURE_TOLERANCE_SECS/);

    const invalid = createEnv({ INGEST_SIGNATURE_TOLERANCE_SECS: "-10" });
    expect(() => validateEnv(invalid)).toThrowError(/INGEST_SIGNATURE_TOLERANCE_SECS/);
  });
});
