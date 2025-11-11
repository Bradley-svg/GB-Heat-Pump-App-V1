import { beforeEach, describe, expect, it, vi } from "vitest";
import { sign } from "@noble/ed25519";
import { handleHeartbeatRequest, handleIngestRequest, verifyBatchSignature } from "./index";
import { jwtVerify } from "jose";
import type { D1Database } from "@cloudflare/workers-types";

vi.mock("jose", () => {
  const mockedVerify = vi.fn(async () => ({ payload: {} }));
  return {
    jwtVerify: mockedVerify,
    createRemoteJWKSet: vi.fn(() => vi.fn()),
  };
});

const encoder = new TextEncoder();
const TEST_PRIV = Uint8Array.from(Buffer.from("5d5f364b70e084d1bce27c8fef2331dfdac06badd7c534dc217446dae3a36d65", "hex"));
const TEST_PUB = "OA2Av2wl9u8Xl7ngeJ8brBCI2TjUG1+4iZIUf33TkyE=";
const createMockDb = () => {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const db = {
    statements,
    prepare(sql: string) {
      return {
        bind: (...params: unknown[]) => ({
          run: async () => {
            statements.push({ sql, params });
            return { success: true };
          },
        }),
      };
    },
  };
  return db as unknown as D1Database & { statements: Array<{ sql: string; params: unknown[] }> };
};

const BASE_ENV = {
  ACCESS_AUD: "test-aud",
  ACCESS_JWKS_URL: "https://access.example/cdn-cgi/access/certs",
  EXPORT_VERIFY_PUBKEY: TEST_PUB,
};

describe("overseas worker", () => {
  beforeEach(() => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: {} } as any);
  });

  it("validates batch signatures", async () => {
    const payload = {
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
    };
    const signature = Buffer.from(await sign(encoder.encode(JSON.stringify(payload)), TEST_PRIV)).toString("base64");
    await expect(verifyBatchSignature(payload, signature, { EXPORT_VERIFY_PUBKEY: TEST_PUB })).resolves.toBeUndefined();
  });

  it("rejects ingest without Access assertion", async () => {
    const req = new Request("https://worker.test/api/ingest/demo", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "X-Batch-Signature": Buffer.from("deadbeef").toString("base64"),
        "content-type": "application/json",
      },
      body: JSON.stringify({ batchId: "b2", records: [] }),
    });
    const env = { ...BASE_ENV, DB: createMockDb() } as any;
    const res = await handleIngestRequest(req as any, env as any);
    expect(res.status).toBe(401);
  });

  it("rejects ingest when Access verification fails", async () => {
    vi.mocked(jwtVerify).mockRejectedValueOnce(new Error("invalid"));
    const req = new Request("https://worker.test/api/ingest/demo", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "X-Batch-Signature": Buffer.from("deadbeef").toString("base64"),
        "content-type": "application/json",
        "CF-Access-Jwt-Assertion": "bad-token",
      },
      body: JSON.stringify({ batchId: "b3", records: [] }),
    });
    const env = { ...BASE_ENV, DB: createMockDb() } as any;
    const res = await handleIngestRequest(req as any, env as any);
    expect(res.status).toBe(403);
  });

  it("accepts ingest when Access verification succeeds and persists batch", async () => {
    const payload = {
      batchId: "b4",
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
    };
    const signature = Buffer.from(await sign(encoder.encode(JSON.stringify(payload)), TEST_PRIV)).toString("base64");
    const req = new Request("https://worker.test/api/ingest/demo", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "X-Batch-Signature": signature,
        "content-type": "application/json",
        "CF-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify(payload),
    });
    const env = { ...BASE_ENV, DB: createMockDb() } as any;
    const res = await handleIngestRequest(req as any, env as any);
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ accepted: 1 });
    expect(env.DB.statements).toHaveLength(1);
    const [statement] = env.DB.statements;
    expect(statement.sql).toContain("ingest_batches");
    expect(statement.params[1]).toBe(payload.batchId);
    expect(statement.params[2]).toBe("demo");
    expect(statement.params[3]).toBe(payload.records.length);
  });

  it("records heartbeats to storage", async () => {
    const heartbeatPayload = {
      keyVersion: "v2",
      timestamp: new Date().toISOString(),
    };
    const req = new Request("https://worker.test/api/heartbeat/demo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "CF-Access-Jwt-Assertion": "good-token",
      },
      body: JSON.stringify(heartbeatPayload),
    });
    const env = { ...BASE_ENV, DB: createMockDb() } as any;
    const res = await handleHeartbeatRequest(req as any, env as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", keyVersion: heartbeatPayload.keyVersion });
    expect(env.DB.statements).toHaveLength(1);
    const [statement] = env.DB.statements;
    expect(statement.sql).toContain("ingest_heartbeats");
    expect(statement.params[1]).toBe("demo");
    expect(statement.params[2]).toBe(heartbeatPayload.keyVersion);
  });
});
