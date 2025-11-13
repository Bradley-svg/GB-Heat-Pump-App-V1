import "../helpers/setup";

import { describe, expect, it } from "vitest";
import { generateKeyPairSync, randomUUID, sign as ed25519Sign } from "node:crypto";

import type { ExportBatch, ExportRecord } from "../../src/schemas/export";
import app from "../../src/app";
import { createWorkerEnv } from "../helpers/worker-env";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const PUBLIC_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();

function makeRecord(index: number): ExportRecord {
  const timestamp = new Date(Date.now() - index * 60_000).toISOString();
  return {
    didPseudo: `int-test-${index}`,
    seq: index,
    timestamp,
    metrics: {
      supplyC: 30 + index,
      returnC: 25 + index,
      flowLps: 1.25,
      powerKW: 0.75,
      control_mode: "AUTO",
    },
    keyVersion: "integration-test-v1",
  };
}

function signBatchPayload(batch: ExportBatch): string {
  const payload = Buffer.from(JSON.stringify(batch));
  return ed25519Sign(null, payload, privateKey).toString("base64");
}

describe.sequential("Ingest batch transactions", () => {
  it("rolls back the entire batch when a later flush fails", async () => {
    const { env, dispose } = await createWorkerEnv({
      EXPORT_VERIFY_PUBKEY: PUBLIC_PEM,
    });
    const originalBatchRef: {
      fn: ((stmts: Array<{ run: () => Promise<unknown> | unknown }>) => Promise<unknown>) | null;
    } = { fn: null };
    try {
      const db = env.DB as unknown as {
        batch: (stmts: Array<{ run: () => Promise<unknown> | unknown }>) => Promise<unknown>;
      };
      const originalBatch =
        typeof db.batch === "function" ? (db.batch.bind(db) as typeof db.batch) : null;
      if (!originalBatch) {
        throw new Error("env.DB.batch is not available for test overrides");
      }
      originalBatchRef.fn = originalBatch;
      let flushCount = 0;
      db.batch = async (statements) => {
        flushCount += 1;
        if (flushCount === 2) {
          throw new Error("forced batch failure");
        }
        return originalBatch(statements);
      };

      const records = Array.from({ length: 10 }, (_, idx) => makeRecord(idx));
      const ingestBatch: ExportBatch = {
        batchId: `int-batch-${randomUUID()}`,
        count: records.length,
        records,
      };
      const signedPayload = signBatchPayload(ingestBatch);

      const response = await app.fetch(
        new Request("https://worker.test/api/ingest/profile-west", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-batch-signature": signedPayload,
          },
          body: JSON.stringify(ingestBatch),
        }),
        env,
      );

      expect(response.status).toBe(500);

      const telemetryRow = await env.DB
        .prepare(
          "SELECT COUNT(*) AS cnt FROM telemetry WHERE device_id LIKE 'int-test-%'",
        )
        .first<{ cnt: number }>();
      expect(telemetryRow?.cnt ?? 0).toBe(0);

      const batchRow = await env.DB
        .prepare("SELECT COUNT(*) AS cnt FROM ingest_batches WHERE batch_id = ?1")
        .bind(ingestBatch.batchId)
        .first<{ cnt: number }>();
      expect(batchRow?.cnt ?? 0).toBe(0);
    } finally {
      const db = env.DB as unknown as { batch?: typeof env.DB.batch };
      if (db && typeof db.batch === "function" && originalBatchRef.fn) {
        db.batch = originalBatchRef.fn;
      }
      dispose();
    }
  });
});
