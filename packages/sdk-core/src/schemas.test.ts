import { describe, expect, it } from "vitest";
import { ingestPayloadSchema, pseudonymizedRecordSchema, telemetryMetricsSchema } from "./schemas";

const baseMetrics = {
  supplyC: 45.2,
  returnC: 40.1,
  timestamp_minute: "2024-05-20T10:30:00.000Z",
};

describe("telemetryMetricsSchema", () => {
  it("validates minimal payload", () => {
    expect(() => telemetryMetricsSchema.parse(baseMetrics)).not.toThrow();
  });

  it("rejects invalid values", () => {
    expect(() =>
      telemetryMetricsSchema.parse({
        ...baseMetrics,
        supplyC: -200,
      }),
    ).toThrow();
  });
});

describe("ingestPayloadSchema", () => {
  it("validates ingest payload", () => {
    expect(() =>
      ingestPayloadSchema.parse({
        deviceId: "dev-123",
        seq: 10,
        timestamp: "2024-05-20T10:30:00.000Z",
        metrics: {
          supplyC: 40,
          returnC: 39.5,
        },
      }),
    ).not.toThrow();
  });
});

describe("pseudonymizedRecordSchema", () => {
  it("validates export record", () => {
    expect(() =>
      pseudonymizedRecordSchema.parse({
        didPseudo: "abcdef1234567890",
        keyVersion: "v1",
        timestamp: "2024-05-20T10:30:00.000Z",
        metrics: baseMetrics,
      }),
    ).not.toThrow();
  });
});
