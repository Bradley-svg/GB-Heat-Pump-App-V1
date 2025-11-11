import { describe, expect, it } from "vitest";
import { sanitizeTelemetry, SanitizationError } from "../../src/modea/sanitize.js";

const basePayload = {
  deviceId: "hp-1",
  seq: 1,
  timestamp: "2024-01-01T12:34:56Z",
  metrics: {
    supplyC: 45.2,
    control_mode: "AUTO" as const
  }
};

describe("sanitizeTelemetry", () => {
  it("rounds timestamps to minutes", () => {
    const sanitized = sanitizeTelemetry(basePayload);
    expect(sanitized.timestamp).toEqual("2024-01-01T12:34:00.000Z");
    expect(sanitized.metrics.timestamp_minute).toEqual("2024-01-01T12:34:00Z");
  });

  it("rejects forbidden keys", () => {
    expect(() =>
      sanitizeTelemetry({
        ...basePayload,
        metrics: { ...basePayload.metrics, ip: "1.1.1.1" } as never
      })
    ).toThrow(SanitizationError);
  });

  it("rejects embedded identifiers", () => {
    expect(() =>
      sanitizeTelemetry({
        ...basePayload,
        metrics: { ...basePayload.metrics, status_code: "SEE 10.0.0.1" }
      })
    ).toThrow(SanitizationError);
  });
});
