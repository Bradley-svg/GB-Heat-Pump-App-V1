import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExecutionContext, ScheduledEvent } from "@cloudflare/workers-types";

import app from "../app";
import type { Env } from "../env";
import type { Logger } from "../utils/logging";
import * as logging from "../utils/logging";

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
  const bindCalls: any[][] = [];
  const statement = {
    bind: vi.fn(function bind(this: any, ...args: any[]) {
      bindCalls.push(args);
      return statement;
    }),
    all: vi.fn().mockResolvedValue({ results: staleResults }),
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

  return { env, bindCalls, statement, prepare };
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

    await app.scheduled({} as ScheduledEvent, env, {} as ExecutionContext);

    expect(bindCalls[0]?.[0]).toBeCloseTo(120 / 86400, 10);
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

    await app.scheduled({} as ScheduledEvent, env, {} as ExecutionContext);

    expect(bindCalls[0]?.[0]).toBeCloseTo(270 / 86400, 10);
    expect(debug).toHaveBeenCalledWith(
      "cron.offline_check.noop",
      expect.objectContaining({ threshold_secs: 270 }),
    );
  });
});
