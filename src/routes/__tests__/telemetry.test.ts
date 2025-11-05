import { afterEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { D1Database, D1DatabaseAPI } from "@miniflare/d1";

import type { Env, User } from "../../env";
import * as accessModule from "../../lib/access";
import { handleTelemetryLatestBatch, handleTelemetrySeries } from "../telemetry";
import { sealCursorId } from "../../lib/cursor";

const requireAccessUserMock = vi.spyOn(accessModule, "requireAccessUser");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../..");

const MIGRATIONS = [
  "migrations/0001_init.sql",
  "migrations/0002_indexes.sql",
  "migrations/0003_operational_entities.sql",
];

const SEED = "seeds/dev/seed.sql";

const ADMIN_USER: User = {
  email: "admin@example.com",
  roles: ["admin"],
  clientIds: [],
};

const TENANT_USER: User = {
  email: "ops@example.com",
  roles: ["client"],
  clientIds: ["profile-west"],
};

describe("telemetry routes", () => {
  afterEach(() => {
    requireAccessUserMock.mockReset();
  });

  it("returns latest batch data for admins including missing identifiers", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);

    try {
      const body = {
        devices: ["dev-1001", "unknown-123"],
      };
      const request = new Request("https://example.com/api/telemetry/latest-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const response = await handleTelemetryLatestBatch(request, env);
      expect(response.status).toBe(200);
      const payload = (await response.json()) as any;

      expect(Array.isArray(payload.items)).toBe(true);
      expect(payload.items).toHaveLength(1);
      expect(payload.missing).toContain("unknown-123");

      const first = payload.items[0];
      expect(first.device_id).toBe("dev-1001");
      expect(first.profile_id).toBe("profile-west");
      expect(first.latest).toMatchObject({
        supplyC: expect.any(Number),
        returnC: expect.any(Number),
        cop: expect.any(Number),
        faults: [],
      });
      expect(first.latest.payload).toBeDefined();
    } finally {
      sqlite.close();
    }
  });

  it("masks identifiers for tenant callers and honours lookup tokens", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValueOnce(TENANT_USER);

    try {
      const lookup = await sealCursorId(env, "dev-1001");
      const request = new Request("https://example.com/api/telemetry/latest-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ devices: [lookup] }),
      });

      const response = await handleTelemetryLatestBatch(request, env);
      expect(response.status).toBe(200);
      const payload = (await response.json()) as any;

      expect(payload.items).toHaveLength(1);
      const item = payload.items[0];
      expect(item.device_id).not.toBe("dev-1001");
      expect(typeof item.lookup).toBe("string");
      expect(item.latest).toMatchObject({
        supplyC: expect.any(Number),
        faults: expect.any(Array),
      });
      expect(item.latest.payload).toBeUndefined();
    } finally {
      sqlite.close();
    }
  });

  it("aggregates time-series data for device scope", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);

    try {
      const base = Date.UTC(2025, 0, 1, 10, 0, 0);
      await insertTelemetrySamples(env, "dev-1001", [
        {
          ts: base,
          deltaT: 5,
          thermalKW: 4,
          cop: 3.1,
          supplyC: 45,
          returnC: 39.5,
          flowLps: 0.3,
          powerKW: 1.5,
        },
        {
          ts: base + 20_000,
          deltaT: 6,
          thermalKW: 5,
          cop: 3.4,
          supplyC: 46,
          returnC: 39.2,
          flowLps: 0.32,
          powerKW: 1.6,
        },
      ]);

      const start = new Date(base - 60_000).toISOString();
      const end = new Date(base + 120_000).toISOString();
      const request = new Request(
        `https://example.com/api/telemetry/series?scope=device&device=dev-1001&interval=1m&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      );

      const response = await handleTelemetrySeries(request, env);
      expect(response.status).toBe(200);
      const payload = (await response.json()) as any;

      expect(payload.scope).toMatchObject({ type: "device", device_id: "dev-1001" });
      expect(Array.isArray(payload.series)).toBe(true);
      expect(payload.series[0].sample_count).toBe(2);
      expect(payload.series[0].values.thermalKW.avg).toBeCloseTo(4.5, 5);
      expect(payload.series[0].values.deltaT.min).toBeCloseTo(5, 5);
      expect(payload.series[0].values.deltaT.max).toBeCloseTo(6, 5);
    } finally {
      sqlite.close();
    }
  });

  it("rejects unauthorized profile scope requests for tenants", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValueOnce(TENANT_USER);

    try {
      const request = new Request(
        "https://example.com/api/telemetry/series?scope=profile&profile=profile-east&interval=5m",
      );
      const response = await handleTelemetrySeries(request, env);
      expect(response.status).toBe(403);
    } finally {
      sqlite.close();
    }
  });
});

function createTestEnv() {
  const sqlite = new Database(":memory:");
  for (const migration of MIGRATIONS) {
    sqlite.exec(readSql(migration));
  }
  sqlite.exec(readSql(SEED));

  const d1 = new D1Database(new D1DatabaseAPI(sqlite as any));
  const db = d1 as any;
  db.withSession = async (callback: (session: any) => Promise<any>) => {
    const session = { prepare: d1.prepare.bind(d1), batch: d1.batch.bind(d1) };
    return callback(session);
  };

    const env: Env = {
      DB: db,
      ACCESS_JWKS_URL: "https://access.test/.well-known/jwks.json",
      ACCESS_AUD: "test-aud",
      APP_BASE_URL: "https://example.com/app",
      RETURN_DEFAULT: "https://example.com",
      CURSOR_SECRET: "integration-secret-telemetry",
      HEARTBEAT_INTERVAL_SECS: "30",
      OFFLINE_MULTIPLIER: "6",
      INGEST_ALLOWED_ORIGINS: "https://devices.example.com",
      INGEST_RATE_LIMIT_PER_MIN: "120",
      INGEST_SIGNATURE_TOLERANCE_SECS: "300",
    };

  return { env, sqlite };
}

function readSql(relative: string) {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

async function insertTelemetrySamples(
  env: Env,
  deviceId: string,
  samples: Array<{
    ts: number;
    deltaT: number;
    thermalKW: number;
    cop: number;
    supplyC: number;
    returnC: number;
    flowLps: number;
    powerKW: number;
  }>,
) {
  for (const sample of samples) {
    await env.DB.prepare(
      `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'measured', ?7, '[]')`,
    )
      .bind(
        deviceId,
        sample.ts,
        JSON.stringify({
          supplyC: sample.supplyC,
          returnC: sample.returnC,
          flowLps: sample.flowLps,
          powerKW: sample.powerKW,
        }),
        sample.deltaT,
        sample.thermalKW,
        sample.cop,
        JSON.stringify({ mode: "heating" }),
      )
      .run();
  }
}
