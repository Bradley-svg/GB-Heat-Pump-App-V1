import Database from "better-sqlite3";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { D1Database, D1DatabaseAPI } from "@miniflare/d1";

import type { Env } from "../../env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../..");

const MIGRATIONS = [
  "migrations/0001_init.sql",
  "migrations/0002_indexes.sql",
  "migrations/0003_operational_entities.sql",
  "migrations/0004_ops_metrics_window.sql",
  "migrations/0005_ops_metrics_rate_limit_index.sql",
  "migrations/0007_alert_lifecycle.sql",
  "migrations/0008_device_key_hash_constraint.sql",
  "migrations/0009_ingest_nonces.sql",
  "migrations/0010_ops_metrics_device_route_index.sql",
  "migrations/0011_cron_cursors.sql",
  "migrations/0012_enforce_foreign_keys.sql",
  "migrations/0013_dashboard_indexes.sql",
  "migrations/0014_cache_tokens.sql",
  "migrations/0015_auth.sql",
];

const SEED = "seeds/dev/seed.sql";

export function createTelemetryTestEnv() {
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

export async function insertTelemetrySamples(
  env: Env,
  deviceId: string,
  samples: Array<{
    ts: number;
    deltaT?: number | null;
    thermalKW?: number | null;
    cop?: number | null;
    supplyC?: number | null;
    returnC?: number | null;
    flowLps?: number | null;
    powerKW?: number | null;
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
          supplyC: sample.supplyC ?? null,
          returnC: sample.returnC ?? null,
          flowLps: sample.flowLps ?? null,
          powerKW: sample.powerKW ?? null,
        }),
        sample.deltaT ?? null,
        sample.thermalKW ?? null,
        sample.cop ?? null,
        JSON.stringify({ mode: "heating" }),
      )
      .run();
  }
}

function readSql(relative: string) {
  return readFileSync(path.join(ROOT, relative), "utf8");
}
