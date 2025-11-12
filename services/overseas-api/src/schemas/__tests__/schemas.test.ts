import { describe, expect, it } from "vitest";
import {
  AdminOverviewQuerySchema,
  AlertsQuerySchema,
  ArchiveQuerySchema,
  ClientCompactQuerySchema,
  DeviceHistoryQuerySchema,
  FleetSummaryQuerySchema,
  HeartbeatPayloadSchema,
  ListDevicesQuerySchema,
  MetricsQuerySchema,
  TelemetryPayloadSchema,
} from "..";

describe("TelemetryPayloadSchema", () => {
  it("parses a complete payload", () => {
    const result = TelemetryPayloadSchema.safeParse({
      device_id: "dev-123",
      ts: "2024-01-01T00:00:00.000Z",
      metrics: {
        supplyC: 48.2,
        returnC: 36.1,
        flowLps: 0.2,
        powerKW: 1.3,
        mode: "heat",
        defrost: null,
      },
      faults: ["low-flow"],
      rssi: -42,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metrics.mode).toBe("heat");
      expect(result.data.faults).toEqual(["low-flow"]);
    }
  });

  it("rejects missing required fields", () => {
    const result = TelemetryPayloadSchema.safeParse({
      ts: "2024-01-01T00:00:00.000Z",
      metrics: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid metric types", () => {
    const result = TelemetryPayloadSchema.safeParse({
      device_id: "dev-123",
      ts: "2024-01-01T00:00:00.000Z",
      metrics: { supplyC: "hot" },
    });
    expect(result.success).toBe(false);
  });
});

describe("HeartbeatPayloadSchema", () => {
  it("parses optional fields", () => {
    const result = HeartbeatPayloadSchema.safeParse({
      device_id: "dev-123",
      ts: "2024-01-01T00:00:00.000Z",
      rssi: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing device_id", () => {
    const result = HeartbeatPayloadSchema.safeParse({
      ts: "2024-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("Query schemas", () => {
  it("applies defaults for client compact", () => {
    const result = ClientCompactQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hours).toBe(24);
      expect(result.data.lowDeltaT).toBe(2);
    }
  });

  it("rejects invalid client compact hours", () => {
    const result = ClientCompactQuerySchema.safeParse({ hours: "0" });
    expect(result.success).toBe(false);
  });

  it("parses alerts query params", () => {
    const result = AlertsQuerySchema.safeParse({ limit: "25", hours: "48" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
      expect(result.data.hours).toBe(48);
    }
  });

  it("rejects alerts limit above max", () => {
    const result = AlertsQuerySchema.safeParse({ limit: "1000" });
    expect(result.success).toBe(false);
  });

  it("parses archive query defaults", () => {
    const result = ArchiveQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offlineHours).toBe(72);
      expect(result.data.days).toBe(14);
    }
  });

  it("parses fleet summary params", () => {
    const result = FleetSummaryQuerySchema.safeParse({ hours: "12", lowDeltaT: "5" });
    expect(result.success).toBe(true);
  });

  it("parses list devices query", () => {
    const result = ListDevicesQuerySchema.safeParse({ mine: "1", limit: "10", cursor: "ts|abc" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mine).toBe(true);
      expect(result.data.limit).toBe(10);
      expect(result.data.cursor).toBe("ts|abc");
    }
  });

  it("rejects invalid boolean flags", () => {
    const result = ListDevicesQuerySchema.safeParse({ mine: "maybe" });
    expect(result.success).toBe(false);
  });

  it("parses device history limit", () => {
    const result = DeviceHistoryQuerySchema.safeParse({ limit: "120" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(120);
    }
  });

  it("rejects metrics format other than prom/json", () => {
    const result = MetricsQuerySchema.safeParse({ format: "xml" });
    expect(result.success).toBe(false);
  });

  it("parses metrics format case-insensitively", () => {
    const result = MetricsQuerySchema.safeParse({ format: "JSON" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe("json");
    }
  });

  it("parses admin overview limit", () => {
    const result = AdminOverviewQuerySchema.safeParse({ limit: "30" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(30);
    }
  });
});
