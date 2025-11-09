import { describe, expect, it } from "vitest";
import { buildServer } from "./server";

const baseMetrics = {
  supplyC: 45,
  returnC: 40,
  flowLps: 10,
  timestamp_minute: new Date().toISOString(),
};

describe("cn-gateway server", () => {
  const app = buildServer({ logger: false });

  it("accepts ingest payloads", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/ingest",
      payload: {
        deviceId: "dev-1",
        seq: 1,
        timestamp: new Date().toISOString(),
        metrics: { supplyC: 40, returnC: 39 },
      },
    });
    expect(res.statusCode).toBe(202);
  });

  it("validates pseudonymized export", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/export",
      payload: {
        batchId: "batch-1",
        records: [
          {
            didPseudo: "abc123456789",
            keyVersion: "v1",
            timestamp: new Date().toISOString(),
            metrics: baseMetrics,
          },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
  });
});
