import { describe, expect, it, vi } from "vitest";

import { runClientEventsBackfill, CLIENT_EVENT_BACKFILL_LIMIT } from "../client-events-backfill";
import type { Env } from "../../env";
import type { Logger } from "../../utils/logging";

function createLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    with: vi.fn().mockReturnThis(),
  } as unknown as Logger;
}

describe("runClientEventsBackfill", () => {
  it("throws when CLIENT_EVENT_TOKEN_SECRET is missing", async () => {
    await expect(
      runClientEventsBackfill({ CLIENT_EVENT_TOKEN_SECRET: "" } as unknown as Env),
    ).rejects.toThrowError("CLIENT_EVENT_TOKEN_SECRET not configured");
  });

  it("rehashes legacy rows and reports progress", async () => {
    const rows = [
      { id: "row-1", user_email: "legacy@example.com" },
      { id: "row-2", user_email: "legacy2@example.com" },
    ];
    const selectAll = vi.fn().mockResolvedValue({ results: rows });
    const updateRun = vi.fn().mockResolvedValue({ success: true });

    const env = {
      CLIENT_EVENT_TOKEN_SECRET: "secret-value",
      DB: {
        prepare: vi.fn((sql: string) => {
          if (sql.includes("SELECT id, user_email")) {
            return {
              bind: () => ({
                all: selectAll,
              }),
            };
          }
          if (sql.startsWith("UPDATE client_events")) {
            return {
              bind: () => ({
                run: updateRun,
              }),
            };
          }
          throw new Error(`Unexpected SQL: ${sql}`);
        }),
      },
    } as unknown as Env;

    const summary = await runClientEventsBackfill(env, { logger: createLogger() });

    expect(summary.status).toBe("complete");
    expect(summary.processed).toBe(rows.length);
    expect(summary.updated).toBe(rows.length);
    expect(summary.has_more).toBe(false);
    expect(selectAll).toHaveBeenCalledWith();
    expect(updateRun).toHaveBeenCalledTimes(rows.length);
  });

  it("returns complete when no rows remain", async () => {
    const env = {
      CLIENT_EVENT_TOKEN_SECRET: "secret-value",
      DB: {
        prepare: vi.fn((sql: string) => {
          if (sql.includes("SELECT id, user_email")) {
            return {
              bind: () => ({
                all: vi.fn().mockResolvedValue({ results: [] }),
              }),
            };
          }
          throw new Error(`Unexpected SQL: ${sql}`);
        }),
      },
    } as unknown as Env;

    const summary = await runClientEventsBackfill(env, { logger: createLogger() });
    expect(summary).toEqual({
      status: "complete",
      processed: 0,
      updated: 0,
      has_more: false,
    });
  });

  it("reports has_more when row count meets the limit", async () => {
    const rows = Array.from({ length: CLIENT_EVENT_BACKFILL_LIMIT }, (_, idx) => ({
      id: `row-${idx}`,
      user_email: `legacy-${idx}@example.com`,
    }));

    const env = {
      CLIENT_EVENT_TOKEN_SECRET: "secret-value",
      DB: {
        prepare: vi.fn((sql: string) => {
          if (sql.includes("SELECT id, user_email")) {
            return {
              bind: () => ({
                all: vi.fn().mockResolvedValue({ results: rows }),
              }),
            };
          }
          if (sql.startsWith("UPDATE client_events")) {
            return {
              bind: () => ({
                run: vi.fn().mockResolvedValue({ success: true }),
              }),
            };
          }
          throw new Error(`Unexpected SQL: ${sql}`);
        }),
      },
    } as unknown as Env;

    const summary = await runClientEventsBackfill(env, { logger: createLogger() });
    expect(summary.status).toBe("ok");
    expect(summary.has_more).toBe(true);
  });
});
