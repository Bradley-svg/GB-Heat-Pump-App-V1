import { describe, expect, it } from "vitest";
import worker from "./index";

const ctx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as ExecutionContext;

describe("overseas worker", () => {
  it("accepts ingest batches", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/api/ingest/default", {
        method: "POST",
        headers: { Authorization: "Bearer test" },
        body: JSON.stringify({
          batchId: "b1",
          records: [
            {
              didPseudo: "abc123456789",
              keyVersion: "v1",
              timestamp: new Date().toISOString(),
              metrics: {
                supplyC: 40,
                returnC: 35,
                timestamp_minute: new Date().toISOString(),
              },
            },
          ],
        }),
      }),
      {},
      ctx,
    );
    expect(res.status).toBe(202);
  });
});
