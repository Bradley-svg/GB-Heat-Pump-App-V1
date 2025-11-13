import { describe, expect, it, vi, afterEach } from "vitest";

import type { Env, User } from "../../env";
import { requireAccessUser } from "../access";
import { jwtVerify } from "jose";
import { encodeDevAllowUser } from "../../../tests/helpers/dev-user";

vi.mock("jose", () => {
  const jwtVerifyMock = vi.fn(async () => ({
    payload: {
      email: "admin@example.com",
      roles: ["admin"],
      clientIds: [],
    } satisfies Partial<User>,
  }));
  return {
    createRemoteJWKSet: vi.fn(() => vi.fn()),
    decodeJwt: vi.fn(() => ({})),
    jwtVerify: jwtVerifyMock,
  };
});

function createEnv(overrides: Partial<Env> = {}): Env {
  const statement = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn(),
    all: vi.fn(),
    first: vi.fn(),
  };
  const DB = {
    prepare: vi.fn().mockReturnValue(statement),
  } as unknown as Env["DB"];

  const baseEnv: Env = {
    DB,
    ACCESS_JWKS_URL: "https://access.test.example/cdn-cgi/access/certs",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "https://app.example",
    RETURN_DEFAULT: "https://www.example.com/",
    CURSOR_SECRET: "test-cursor-secret-value",
    INGEST_ALLOWED_ORIGINS: "*",
    INGEST_RATE_LIMIT_PER_MIN: "0",
    INGEST_SIGNATURE_TOLERANCE_SECS: "300",
    INGEST_FAILURE_LIMIT_PER_MIN: "0",
    INGEST_IP_LIMIT_PER_MIN: "0",
    INGEST_IP_BLOCK_SECONDS: "60",
    INGEST_IP_BUCKETS: undefined,
    ALLOW_RAW_INGEST: "false",
    AUTH_IP_LIMIT_PER_MIN: "0",
    AUTH_IP_BLOCK_SECONDS: "60",
    AUTH_IP_BUCKETS: undefined,
    TELEMETRY_RETENTION_DAYS: "90",
    TELEMETRY_REFACTOR_MODE: "compare",
    RETENTION_BACKUP_PREFIX: "data-retention",
    RETENTION_BACKUP_BEFORE_DELETE: "false",
    LOG_LEVEL: "info",
    LOG_DEBUG_SAMPLE_RATE: "1",
    OBSERVABILITY_MAX_BYTES: "16384",
    TELEMETRY_CARRY_MAX_MINUTES: "0",
    CLIENT_COMPACT_CACHE_TTL_SECS: "60",
    CLIENT_QUERY_PROFILE: "",
    CLIENT_QUERY_PROFILE_THRESHOLD_MS: "2000",
    ARCHIVE_CACHE_TTL_SECS: "60",
    PASSWORD_PBKDF2_ITERATIONS: "600000",
    PASSWORD_RESET_WEBHOOK_URL: "https://hooks.test/password-reset",
    PASSWORD_RESET_WEBHOOK_SECRET: "reset-secret",
    EMAIL_VERIFICATION_WEBHOOK_URL: "https://hooks.test/email-verification",
    EMAIL_VERIFICATION_WEBHOOK_SECRET: "verify-secret",
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: "300",
    CLIENT_EVENT_RETENTION_DAYS: "60",
    CLIENT_EVENT_LIMIT_PER_MIN: "0",
    CLIENT_EVENT_BLOCK_SECONDS: "60",
    CLIENT_EVENT_IP_BUCKETS: undefined,
    CLIENT_EVENT_TOKEN_SECRET: "test-client-event-token-secret-rotate-1234567890",
    CLIENT_EVENT_TOKEN_TTL_SECONDS: "900",
    HEARTBEAT_INTERVAL_SECS: "30",
    OFFLINE_MULTIPLIER: "6",
    DEV_ALLOW_USER: undefined,
    ALLOW_DEV_ACCESS_SHIM: undefined,
    ENVIRONMENT: "test",
  };

  return { ...baseEnv, ...overrides };
}

const jwtVerifyMock = vi.mocked(jwtVerify);

afterEach(() => {
  vi.clearAllMocks();
  jwtVerifyMock.mockClear();
});

describe("requireAccessUser", () => {
  it("verifies Cloudflare Access JWTs with issuer + clock tolerance", async () => {
    const env = createEnv();
    const req = new Request("https://app.example/api", {
      headers: {
        "Cf-Access-Jwt-Assertion": "test.jwt.token",
      },
    });

    const user = await requireAccessUser(req, env);
    expect(user?.email).toBe("admin@example.com");
    expect(jwtVerifyMock).toHaveBeenCalledWith(
      "test.jwt.token",
      expect.any(Function),
      expect.objectContaining({
        audience: env.ACCESS_AUD,
        issuer: "https://access.test.example",
        clockTolerance: 60,
      }),
    );
  });

  it("returns the dev shim user when encoded payloads are provided", async () => {
    const env = createEnv({
      APP_BASE_URL: "http://127.0.0.1:8787/app",
      ENVIRONMENT: "development",
      ALLOW_DEV_ACCESS_SHIM: "true",
      DEV_ALLOW_USER: encodeDevAllowUser({
        email: "shim@example.com",
        roles: ["admin"],
        clientIds: ["profile-west"],
      }),
    });
    const req = new Request("https://app.example/app");
    const user = await requireAccessUser(req, env, { allowSession: false });

    expect(user).toEqual({
      email: "shim@example.com",
      roles: ["admin"],
      clientIds: ["profile-west"],
    });
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });
});
