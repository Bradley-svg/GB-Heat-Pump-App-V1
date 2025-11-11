import { afterEach, describe, expect, it, vi } from "vitest";

import type { Env, User } from "../../env";
import { handleClientEventsBackfill } from "../admin";
import * as accessModule from "../../lib/access";

const ADMIN_USER: User = {
  email: "admin@example.com",
  roles: ["admin"],
  clientIds: [],
};

const requireAccessUserMock = vi.spyOn(accessModule, "requireAccessUser");

function createEnv(overrides: Partial<Env> = {}): Env {
  const baseEnv: Env = {
    DB: undefined as unknown as Env["DB"],
    ACCESS_JWKS_URL: "https://access.test/.well-known/jwks.json",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "https://app.test",
    RETURN_DEFAULT: "https://www.example.com/",
    CURSOR_SECRET: "integration-secret",
    HEARTBEAT_INTERVAL_SECS: "30",
    OFFLINE_MULTIPLIER: "6",
    INGEST_ALLOWED_ORIGINS: "*",
    INGEST_RATE_LIMIT_PER_MIN: "120",
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
    CLIENT_EVENT_TOKEN_SECRET: "integration-telemetry-token-secret-rotate-1234567890",
    CLIENT_EVENT_TOKEN_TTL_SECONDS: "900",
    DEV_ALLOW_USER: undefined,
    ALLOW_DEV_ACCESS_SHIM: undefined,
    ENVIRONMENT: "test",
  };

  return { ...baseEnv, ...overrides };
}

afterEach(() => {
  requireAccessUserMock.mockReset();
});

describe("handleClientEventsBackfill", () => {
  it("rehashes plaintext client event emails in batches", async () => {
    const selectAll = vi.fn().mockResolvedValue({
      results: [{ id: "event-1", user_email: "operator@example.com" }],
    });
    const selectStatement = {
      bind: vi.fn().mockReturnValue({ all: selectAll }),
    };
    const updateRun = vi.fn();
    const updateBind = vi.fn().mockReturnValue({ run: updateRun });
    const updateStatement = { bind: updateBind };

    const env = createEnv({
      DB: {
        prepare: vi.fn((sql: string) => {
          if (sql.startsWith("SELECT id, user_email")) {
            return selectStatement as any;
          }
          if (sql.startsWith("UPDATE client_events")) {
            return updateStatement as any;
          }
          throw new Error(`Unexpected SQL: ${sql}`);
        }),
      } as Env["DB"],
    });

    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);

    const res = await handleClientEventsBackfill(
      new Request("https://app.test/api/admin/client-events/backfill", { method: "POST" }),
      env,
    );

    expect(res.status).toBe(200);
    expect(selectStatement.bind).toHaveBeenCalledWith(250);
    expect(updateBind).toHaveBeenCalledWith(expect.stringMatching(/^sha256:/), "event-1");
    expect(updateRun).toHaveBeenCalled();
    const payload = await res.json();
    expect(payload).toMatchObject({ status: "ok", processed: 1, updated: 1 });
  });

  it("returns complete when no rows remain", async () => {
    const selectStatement = {
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    };
    const env = createEnv({
      DB: {
        prepare: vi.fn(() => selectStatement as any),
      } as Env["DB"],
    });
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);

    const res = await handleClientEventsBackfill(
      new Request("https://app.test/api/admin/client-events/backfill", { method: "POST" }),
      env,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "complete", updated: 0 });
  });
});
