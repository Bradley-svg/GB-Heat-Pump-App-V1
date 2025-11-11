import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import { buildServer } from "../../src/server.js";
import { truncateAll } from "../utils/db.js";
import { verifyBatchSignature } from "../../src/crypto/ed25519.js";

const captured = (globalThis as unknown as { __EXPORT_REQUESTS__?: Array<{ body: string; headers: Record<string, string> }> })
  .__EXPORT_REQUESTS__!;

beforeEach(() => {
  captured.length = 0;
});

function signBody(payload: object) {
  return crypto
    .createHmac("sha256", "test-secret")
    .update(JSON.stringify(payload))
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

describe("end-to-end exporter", () => {
  it("signs and ships batches", async () => {
    const app = await buildServer();
    truncateAll();
    const sample = {
      deviceId: "hp-e2e",
      seq: 0,
      timestamp: new Date().toISOString(),
      metrics: {
        supplyC: 30,
        control_mode: "AUTO" as const
      }
    };

    for (let i = 0; i < 3; i += 1) {
      const payload = { ...sample, seq: i };
      await app.inject({
        method: "POST",
        url: "/ingest",
        headers: {
          "content-type": "application/json",
          "x-device-signature": signBody(payload)
        },
        payload
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(captured.length).toBeGreaterThan(0);
    const { body, headers } = captured.pop()!;
    const signature = headers["x-batch-signature"];
    const publicKey = readFileSync("test/fixtures/export-ed25519.pub", "utf8");
    const ok = await verifyBatchSignature(Buffer.from(body), signature, publicKey);
    expect(ok).toBe(true);
    await app.close();
  });
});
