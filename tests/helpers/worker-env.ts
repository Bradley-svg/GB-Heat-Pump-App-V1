import Database from "better-sqlite3";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { D1Database as MiniflareD1Database, D1DatabaseAPI } from "@miniflare/d1";

import type { Env } from "../../src/env";
import { createTestKvNamespace } from "./kv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const MIGRATIONS_DIR = path.join(ROOT_DIR, "migrations");
const SEEDS_DIR = path.join(ROOT_DIR, "seeds", "dev");

const MIGRATION_FILES = [
  "0001_init.sql",
  "0002_indexes.sql",
  "0003_operational_entities.sql",
  "0004_ops_metrics_window.sql",
  "0005_ops_metrics_rate_limit_index.sql",
  "0007_alert_lifecycle.sql",
  "0008_device_key_hash_constraint.sql",
  "0009_ingest_nonces.sql",
  "0010_ops_metrics_device_route_index.sql",
  "0011_cron_cursors.sql",
  "0012_enforce_foreign_keys.sql",
  "0013_dashboard_indexes.sql",
  "0014_cache_tokens.sql",
  "0015_auth.sql",
  "0016_email_verifications.sql",
  "0017_client_events.sql",
  "0018_backfill_signup_events.sql",
  "0019_email_verification_cleanup.sql",
  "schema-indexes.sql",
];

export interface WorkerEnvContext {
  env: Env;
  dispose: () => void;
}

export async function createWorkerEnv(overrides: Partial<Env> = {}): Promise<WorkerEnvContext> {
  const sqlite = new Database(":memory:");

  for (const migration of MIGRATION_FILES) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, migration), "utf8");
    sqlite.exec(sql);
  }

  const seedSql = await readFile(path.join(SEEDS_DIR, "seed.sql"), "utf8");
  sqlite.exec(seedSql);

  const api = new D1DatabaseAPI(sqlite as any);
  const boundFetch = (api as any).fetch.bind(api as any);

  const rawDb = new MiniflareD1Database({
    fetch: boundFetch as any,
  });

  const DB = rawDb as unknown as Env["DB"];

  const baseEnv: Env = {
    DB,
    ACCESS_JWKS_URL: "https://access.test/.well-known/jwks.json",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "https://app.test",
    RETURN_DEFAULT: "https://www.example.com/",
    CURSOR_SECRET: "integration-secret",
    HEARTBEAT_INTERVAL_SECS: "30",
    OFFLINE_MULTIPLIER: "6",
    INGEST_ALLOWED_ORIGINS: "https://devices.test",
    INGEST_RATE_LIMIT_PER_MIN: "120",
    INGEST_SIGNATURE_TOLERANCE_SECS: "300",
    INGEST_IP_LIMIT_PER_MIN: "0",
    INGEST_IP_BLOCK_SECONDS: "60",
    ENVIRONMENT: "test",
    INGEST_IP_BUCKETS: createTestKvNamespace(),
    AUTH_IP_LIMIT_PER_MIN: "0",
    AUTH_IP_BLOCK_SECONDS: "60",
    AUTH_IP_BUCKETS: createTestKvNamespace(),
    CLIENT_EVENT_LIMIT_PER_MIN: "0",
    CLIENT_EVENT_BLOCK_SECONDS: "60",
    CLIENT_EVENT_IP_BUCKETS: createTestKvNamespace(),
    PASSWORD_RESET_WEBHOOK_URL: "https://hooks.test/password-reset",
    PASSWORD_RESET_WEBHOOK_SECRET: "dev-reset-secret",
    EMAIL_VERIFICATION_WEBHOOK_URL: "https://hooks.test/email-verification",
    EMAIL_VERIFICATION_WEBHOOK_SECRET: "dev-verification-secret",
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: "300",
    CLIENT_EVENT_RETENTION_DAYS: "60",
    CLIENT_EVENT_TOKEN_SECRET: "integration-telemetry-token-secret-rotate-1234567890",
    CLIENT_EVENT_TOKEN_TTL_SECONDS: "900",
  };

  const env: Env = { ...baseEnv, ...overrides, DB };

  return {
    env,
    dispose: () => {
      sqlite.close();
    },
  };
}

