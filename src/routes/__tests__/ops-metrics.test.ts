import { describe, expect, it, vi, afterEach } from "vitest";

import type { Env } from "../../env";
import type { Logger } from "../../utils/logging";
import { recordOpsMetric } from "../ingest";

describe("recordOpsMetric", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("logs structured metrics when the ops_metrics insert fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-02-03T04:05:06.789Z"));

    const run = vi.fn().mockRejectedValue(new Error("d1 unavailable"));
    const bind = vi.fn(() => ({ run }));
    const prepare = vi.fn(() => ({ bind }));

    const env = {
      DB: { prepare },
    } as unknown as Env;

    const errorSpy = vi.fn();
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: errorSpy,
      with: vi.fn(() => logger),
    };

    await recordOpsMetric(env, "/api/test", 500, 123, "dev-1", logger);

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(bind).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message, fields] = errorSpy.mock.calls[0];
    expect(message).toBe("ops_metrics.insert_failed");
    expect(fields).toMatchObject({
      route: "/api/test",
      status_code: 500,
      device_id: "dev-1",
      metric: "greenbro.ops_metrics.insert_failed",
      metric_key: "ops_metrics.insert_failed",
      count: 1,
      bucket_minute: "2025-02-03T04:05:00.000Z",
    });
    expect(fields.error).toBeInstanceOf(Error);
  });
});
