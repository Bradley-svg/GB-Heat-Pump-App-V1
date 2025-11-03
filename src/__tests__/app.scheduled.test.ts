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
  const bindCalls: unknown[][] = [];
  const run = vi.fn(async () => ({ success: true, meta: { changes: 0 } }));
  const statement: StatementMock = {
    bind: vi.fn(function bind(this: StatementMock, ...args: unknown[]) {
      bindCalls.push(args);
      return this;
    }) as StatementMock["bind"],
    all: vi.fn(async function all() {
      return { results: staleResults };
    }) as StatementMock["all"],
    run: run as StatementMock["run"],
  };
  const prepare = vi.fn().mockReturnValue(statement);
  const env = {
    DB: { prepare } as unknown as Env["DB"],
    ACCESS_JWKS_URL: "https://access.example.com/cdn-cgi/access/certs",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "https://app.example.com/app",
    RETURN_DEFAULT: "/",
    CURSOR_SECRET: "cursor-secret-1234567890",
    ...overrides,
  } as Env;

  return { env, bindCalls, statement, prepare, run };
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
    const offlineBind = bindCalls.find(
      (args) => typeof args?.[0] === "number" && (args[0] as number) < 1,
    );
    expect(offlineBind?.[0]).toBeCloseTo(120 / 86400, 10);
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
    const offlineBind = bindCalls.find(
      (args) => typeof args?.[0] === "number" && (args[0] as number) < 1,
    );
    expect(offlineBind?.[0]).toBeCloseTo(270 / 86400, 10);
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
      mqttWebhookMessages: { scanned: 0, deleted: 0, batches: 0, backups: [] },
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
