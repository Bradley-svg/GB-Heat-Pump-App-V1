import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../app";
import type { Env } from "../env";
import type { Logger } from "../utils/logging";
import * as logging from "../utils/logging";
import * as retention from "../jobs/retention";

type ScheduledEvent = Parameters<(typeof app)["scheduled"]>[0];
type ScheduledExecutionContext = Parameters<(typeof app)["scheduled"]>[2];

type StaleResult = { device_id: string };
type StatementMock = {
  bind: (...args: unknown[]) => StatementMock;
  all: () => Promise<{ results: StaleResult[] }>;
  run: () => Promise<{ success: boolean; meta?: { changes?: number } }>;
};

function mockSystemLogger() {
  const debug = vi.fn();
  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();
  const withFn = vi.fn();
  const logger = {
    debug,
    info,
    warn,
    error,
    with: withFn,
  } as unknown as Logger;
  withFn.mockReturnValue(logger);
  const spy = vi.spyOn(logging, "systemLogger").mockReturnValue(logger);
  return { spy, debug };
}

function createScheduledEnv(
  overrides: Partial<Env> = {},
  options: { staleResults?: Array<{ device_id: string }> } = {},
) {
  const { staleResults = [] } = options;
  const rows = staleResults.map((row, index) => ({
    rowid: index + 1,
    device_id: row.device_id,
  }));
  let cursorValue: string | null = null;
  const bindCalls: Array<{ sql: string; args: unknown[] }> = [];
  const run = vi.fn(async () => ({ success: true, meta: { changes: 0 } }));

  const prepare = vi.fn((sql: string) => {
    if (sql.startsWith("DELETE FROM ingest_nonces")) {
      return {
        bind: (...args: unknown[]) => {
          bindCalls.push({ sql, args });
          return {
            run: async () => {
              await run();
              return { success: true, meta: { changes: 0 } };
            },
          };
        },
      } as StatementMock;
    }

    if (sql.includes("SELECT COUNT(*) AS cnt FROM devices")) {
      return {
        bind: (...args: unknown[]) => {
          bindCalls.push({ sql, args });
          return {
            first: async () => ({ cnt: rows.length }),
          };
        },
      } as unknown as StatementMock;
    }

    if (sql.includes("SELECT rowid, device_id FROM devices")) {
      return {
        bind: (...args: unknown[]) => {
          bindCalls.push({ sql, args });
          const [, cursorArg, limitArg] = args;
          const cursor = Number(cursorArg ?? 0);
          const limit = Number(limitArg ?? rows.length);
          const results = rows.filter((row) => row.rowid > cursor).slice(0, limit);
          return {
            all: async () => ({ results }),
          };
        },
      } as unknown as StatementMock;
    }

    if (sql.startsWith("UPDATE devices SET online=0")) {
      return {
        bind: (...args: unknown[]) => {
          bindCalls.push({ sql, args });
          return { run };
        },
      } as StatementMock;
    }

    if (sql.startsWith("UPDATE latest_state SET online=0")) {
      return {
        bind: (...args: unknown[]) => {
          bindCalls.push({ sql, args });
          return { run };
        },
      } as StatementMock;
    }

    if (sql.startsWith("INSERT INTO ops_metrics")) {
      return {
        bind: (...args: unknown[]) => {
          bindCalls.push({ sql, args });
          return { run };
        },
      } as StatementMock;
    }

    if (sql.startsWith("SELECT cursor FROM cron_cursors")) {
      return {
        bind: (...args: unknown[]) => {
          bindCalls.push({ sql, args });
          return {
            first: async () => ({ cursor: cursorValue }),
          };
        },
      } as unknown as StatementMock;
    }

    if (sql.startsWith("DELETE FROM cron_cursors")) {
      return {
        bind: (...args: unknown[]) => {
          bindCalls.push({ sql, args });
          cursorValue = null;
          return { run };
        },
      } as StatementMock;
    }

    if (sql.startsWith("INSERT INTO cron_cursors")) {
      return {
        bind: (...args: unknown[]) => {
          bindCalls.push({ sql, args });
          cursorValue = String(args[1]);
          return { run };
        },
      } as StatementMock;
    }

    throw new Error(`Unexpected SQL in scheduled env mock: ${sql}`);
  });

  const env = {
    DB: { prepare } as unknown as Env["DB"],
    ACCESS_JWKS_URL: "https://access.example.com/cdn-cgi/access/certs",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "https://app.example.com/app",
    RETURN_DEFAULT: "/",
    CURSOR_SECRET: "cursor-secret-1234567890",
    INGEST_ALLOWED_ORIGINS: "https://devices.example.com",
    INGEST_RATE_LIMIT_PER_MIN: "120",
    INGEST_SIGNATURE_TOLERANCE_SECS: "300",
    ...overrides,
  } as Env;

  return { env, bindCalls, prepare, run, cursor: () => cursorValue };
}

describe("app.scheduled", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults the heartbeat interval when the env value is non-finite", async () => {
    const { env, bindCalls } = createScheduledEnv({
      HEARTBEAT_INTERVAL_SECS: "Infinity",
      OFFLINE_MULTIPLIER: "4",
    });
    const { debug } = mockSystemLogger();

    await app.scheduled({} as ScheduledEvent, env, {} as ScheduledExecutionContext);

    expect(bindCalls.length).toBeGreaterThanOrEqual(2);
    const countBind = bindCalls.find((entry) =>
      entry.sql.includes("SELECT COUNT(*) AS cnt FROM devices"),
    );
    expect(typeof countBind?.args?.[0]).toBe("number");
    expect(countBind?.args?.[0]).toBeCloseTo(120 / 86400, 10);
    expect(debug).toHaveBeenCalledWith(
      "cron.offline_check.noop",
      expect.objectContaining({ threshold_secs: 120 }),
    );
  });

  it("defaults the offline multiplier when the env value is non-finite", async () => {
    const { env, bindCalls } = createScheduledEnv({
      HEARTBEAT_INTERVAL_SECS: "45",
      OFFLINE_MULTIPLIER: "NaN",
    });
    const { debug } = mockSystemLogger();

    await app.scheduled({} as ScheduledEvent, env, {} as ScheduledExecutionContext);

    expect(bindCalls.length).toBeGreaterThanOrEqual(2);
    const countBind = bindCalls.find((entry) =>
      entry.sql.includes("SELECT COUNT(*) AS cnt FROM devices"),
    );
    expect(typeof countBind?.args?.[0]).toBe("number");
    expect(countBind?.args?.[0]).toBeCloseTo(270 / 86400, 10);
    expect(debug).toHaveBeenCalledWith(
      "cron.offline_check.noop",
      expect.objectContaining({ threshold_secs: 270 }),
    );
  });

  it("delegates retention cron events to the telemetry retention job", async () => {
    const { env } = createScheduledEnv();
    const retentionSpy = vi.spyOn(retention, "runTelemetryRetention").mockResolvedValue({
      retentionDays: 90,
      cutoffMs: 0,
      cutoffIso: "2024-01-01T00:00:00.000Z",
      telemetry: { scanned: 0, deleted: 0, batches: 0, backups: [] },
      opsMetricsDeleted: 0,
    });
    const { spy } = mockSystemLogger();

    await app.scheduled(
      { cron: retention.TELEMETRY_RETENTION_CRON } as ScheduledEvent,
      env,
      {} as ScheduledExecutionContext,
    );

    expect(retentionSpy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ task: "retention-cron" });

    // Offline cron should not run in this pathway.
    expect(env.DB.prepare).not.toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM ingest_nonces"),
    );
  });
});
