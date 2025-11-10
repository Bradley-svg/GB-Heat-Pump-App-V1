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
      headers: { "Idempotency-Key": "abc" },
      payload: {
        deviceId: "dev-1",
        seq: 1,
        timestamp: new Date().toISOString(),
        metrics: { supplyC: 40, returnC: 39 },
      },
    });
    expect(res.statusCode).toBe(202);
  });

  it("rejects payloads without idempotency header", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/ingest",
      payload: {
        deviceId: "dev-2",
        seq: 1,
        timestamp: new Date().toISOString(),
        metrics: { supplyC: 40, returnC: 39 },
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects old timestamps", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/ingest",
      headers: { "Idempotency-Key": "old" },
      payload: {
        deviceId: "dev-3",
        seq: 1,
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        metrics: { supplyC: 40, returnC: 39 },
      },
    });
    expect(res.statusCode).toBe(422);
  });

  it("rejects duplicate sequences", async () => {
    const payload = {
      deviceId: "dev-4",
      seq: 99,
      timestamp: new Date().toISOString(),
      metrics: { supplyC: 40, returnC: 39 },
    };
    await app.inject({ method: "POST", url: "/ingest", headers: { "Idempotency-Key": "dup1" }, payload });
    const res = await app.inject({ method: "POST", url: "/ingest", headers: { "Idempotency-Key": "dup2" }, payload });
    expect(res.statusCode).toBe(409);
  });

  it("validates pseudonymized export", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/export",
      payload: {
        batchId: "batch-1",
        records: Array.from({ length: 5 }, (_, idx) => ({
          didPseudo: `abc123456789-${idx}`,
          keyVersion: "v1",
          timestamp: new Date().toISOString(),
          metrics: baseMetrics,
        })),
      },
    });
    expect(res.statusCode).toBe(200);
  });
});
