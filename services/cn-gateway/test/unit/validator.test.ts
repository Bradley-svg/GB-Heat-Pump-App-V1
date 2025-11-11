import { describe, expect, it } from "vitest";
import { validateTelemetry } from "../../src/validators/common.js";

describe("telemetry schema", () => {
  it("accepts valid payloads", () => {
    const sample = {
      deviceId: "hp-1",
      seq: 1,
      timestamp: "2024-01-01T00:00:00Z",
      metrics: {
        supplyC: 20,
        control_mode: "AUTO" as const,
        timestamp_minute: "2024-01-01T00:00:00Z"
      }
    };
    expect(validateTelemetry(sample)).toBe(true);
  });

  it("rejects payload with unexpected field", () => {
    const invalid = {
      deviceId: "hp-1",
      seq: 1,
      timestamp: "2024-01-01T00:00:00Z",
      metrics: {
        supplyC: 20,
        temperature: 10
      }
    };
    expect(validateTelemetry(invalid)).toBe(false);
  });
});
