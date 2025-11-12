import { afterEach, describe, expect, it, vi } from "vitest";

import {
  systemLogger,
  configureLogging,
  __resetLoggingConfigForTests,
} from "../logging";

describe("logging configuration", () => {
  const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

  afterEach(() => {
    consoleSpy.mockClear();
    __resetLoggingConfigForTests();
  });

  it("skips debug logs when level is set to info", () => {
    configureLogging({ level: "info" });
    const logger = systemLogger();
    logger.debug("should_skip");
    logger.info("should_log");

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(consoleSpy.mock.calls[0]?.[0] ?? "{}");
    expect(entry.level).toBe("info");
    expect(entry.msg).toBe("should_log");
  });

  it("redacts configured fields before emitting", () => {
    configureLogging({
      redaction: { clientIp: true, userAgent: true, cfRay: true },
    });
    const logger = systemLogger({
      client_ip: "1.2.3.4",
      user_agent: "UnitTest/1.0",
      cf_ray: "abcd",
    });
    logger.info("redaction_test");

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(consoleSpy.mock.calls[0]?.[0] ?? "{}");
    expect(entry.client_ip).toBe("[redacted]");
    expect(entry.user_agent).toBe("[redacted]");
    expect(entry.cf_ray).toBe("[redacted]");
  });
});
