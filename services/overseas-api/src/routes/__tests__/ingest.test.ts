import { describe, expect, it, vi } from "vitest";
import { Buffer } from "node:buffer";
import { generateKeyPairSync, sign as ed25519Sign } from "node:crypto";

import type { Env } from "../../env";
import { handleIngest } from "../ingest";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const PUBLIC_PEM = publicKey.export({ type: "spki", format: "pem" }).toString();

interface StatementRecord {
  sql: string;
  binds: unknown[][];
}

function createDbMock() {
  const statements: StatementRecord[] = [];
  const prepare = vi.fn().mockImplementation((sql: string) => {
    const record: StatementRecord = { sql, binds: [] };
    statements.push(record);
    const chain = {
      bind: vi.fn((...args: unknown[]) => {
        record.binds.push(args);
        return chain;
      }),
      run: vi.fn(),
      first: vi.fn(),
      all: vi.fn()
    };
    return chain;
  });
  const exec = vi.fn().mockResolvedValue(undefined);
  const batch = vi.fn().mockImplementation(async (stmts: Array<{ run: () => void }>) => {
    for (const stmt of stmts) {
      if (typeof stmt.run === "function") {
        stmt.run();
      }
    }
    return [];
  });
  return { DB: { prepare, exec, batch } as unknown as Env["DB"], statements };
}

function baseEnv(overrides: Partial<Env> = {}): Env & { __statements: StatementRecord[] } {
  const { DB, statements } = createDbMock();
  const env: Env & { __statements: StatementRecord[] } = {
    DB,
    ACCESS_JWKS_URL: "https://access.test/.well-known/jwks.json",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "https://app.test/app",
    RETURN_DEFAULT: "https://example.com",
    HEARTBEAT_INTERVAL_SECS: "30",
    OFFLINE_MULTIPLIER: "6",
    CURSOR_SECRET: "secret-secret-1234567890",
    INGEST_ALLOWED_ORIGINS: "*",
    INGEST_RATE_LIMIT_PER_MIN: "0",
    INGEST_SIGNATURE_TOLERANCE_SECS: "300",
    CLIENT_EVENT_TOKEN_SECRET: "client-event-secret-1234567890",
    CLIENT_EVENT_TOKEN_TTL_SECONDS: "900",
    EXPORT_VERIFY_PUBKEY: PUBLIC_PEM,
    ...overrides,
    __statements: statements
  };
  return env;
}

function signPayload(body: string): string {
  const signature = ed25519Sign(null, Buffer.from(body), privateKey);
  return signature.toString("base64");
}

function buildBatchBody(records: any[]) {
  return {
    batchId: "batch-" + crypto.randomUUID(),
    count: records.length,
    records
  };
}

async function sendBatch(env: Env, profile = "demo", body: object, overrideSignature?: string) {
  const jsonBody = JSON.stringify(body);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-batch-signature": overrideSignature ?? signPayload(jsonBody)
  };
  const req = new Request(`https://example.com/api/ingest/${profile}`, {
    method: "POST",
    headers,
    body: jsonBody
  });
  return handleIngest(req, env, profile);
}

describe("handleIngest", () => {
  it("returns 410 when signature header is missing", async () => {
    const env = baseEnv();
    const req = new Request("https://example.com/api/ingest/demo", {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" }
    });
    const res = await handleIngest(req, env, "demo");
    expect(res.status).toBe(410);
    const payload = await res.json();
    expect(payload).toEqual({ error: "raw_ingest_disabled" });
  });

  it("returns 503 when verify key is not configured", async () => {
    const env = baseEnv({ EXPORT_VERIFY_PUBKEY: undefined });
    const body = buildBatchBody([
      {
        didPseudo: "pseudo1234567890",
        seq: 1,
        timestamp: new Date().toISOString(),
        metrics: { supplyC: 10, returnC: 5, flowLps: 1.2, powerKW: 0.4 },
        keyVersion: "v1"
      }
    ]);
    const res = await sendBatch(env, "demo", body);
    expect(res.status).toBe(503);
  });

  it("rejects tampered payloads before JSON parsing", async () => {
    const env = baseEnv();
    const req = new Request("https://example.com/api/ingest/demo", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-batch-signature": signPayload("{}")
      },
      body: "{"
    });
    const res = await handleIngest(req, env, "demo");
    expect(res.status).toBe(401);
  });

  it("rejects invalid signatures", async () => {
    const env = baseEnv();
    const body = buildBatchBody([
      {
        didPseudo: "pseudo1234567890",
        seq: 1,
        timestamp: new Date().toISOString(),
        metrics: { supplyC: 10, returnC: 5 },
        keyVersion: "v1"
      }
    ]);
    const res = await sendBatch(env, "demo", body, "bad-signature");
    expect(res.status).toBe(401);
  });

  it("persists pseudonymous telemetry records when the batch is valid", async () => {
    const env = baseEnv();
    const record = {
      didPseudo: "pseudoABCDEF123456",
      seq: 42,
      timestamp: new Date().toISOString(),
      metrics: {
        supplyC: 32.1,
        returnC: 24.8,
        flowLps: 1.5,
        powerKW: 0.9,
        control_mode: "AUTO" as const,
        status_code: "RUN",
        fault_code: "OK"
      },
      keyVersion: "kms-v2"
    };
    const res = await sendBatch(env, "demo", buildBatchBody([record]));
    expect(res.status).toBe(202);
    const payload = (await res.json()) as any;
    expect(payload.accepted).toBe(1);

    const telemetryInsert = env.__statements.find((stmt) =>
      stmt.sql.startsWith("INSERT INTO telemetry")
    );
    expect(telemetryInsert).toBeTruthy();
    expect(telemetryInsert?.binds[0]?.[0]).toBe(record.didPseudo);

    const deviceUpsert = env.__statements.find((stmt) =>
      stmt.sql.startsWith("INSERT INTO devices")
    );
    expect(deviceUpsert?.binds[0]?.[0]).toBe(record.didPseudo);
    expect(deviceUpsert?.binds[0]?.[1]).toBe("demo");
  });

  it("rejects payloads containing unsupported metric keys", async () => {
    const env = baseEnv();
    const res = await sendBatch(
      env,
      "demo",
      buildBatchBody([
        {
          didPseudo: "pseudoABC",
          seq: 1,
          timestamp: new Date().toISOString(),
          metrics: { notAllowed: 1 },
          keyVersion: "v1"
        }
      ])
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_payload");
  });
});
