import Database from "better-sqlite3";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { D1Database, D1DatabaseAPI } from "@miniflare/d1";

import type { Env } from "../../src/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const MIGRATIONS_DIR = path.join(ROOT_DIR, "migrations");
const SEEDS_DIR = path.join(ROOT_DIR, "seeds", "dev");

const MIGRATION_FILES = [
  "001_init.sql",
  "0002_indexes.sql",
  "0003_operational_entities.sql",
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
  const DB = new D1Database({
    fetch: (input: RequestInfo, init?: RequestInit) => api.fetch(input, init),
  });

  const baseEnv: Env = {
    DB,
    ACCESS_JWKS_URL: "https://access.test/.well-known/jwks.json",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "https://app.test",
    RETURN_DEFAULT: "https://www.example.com/",
    CURSOR_SECRET: "integration-secret",
    HEARTBEAT_INTERVAL_SECS: "30",
    OFFLINE_MULTIPLIER: "6",
  };

  const env: Env = { ...baseEnv, ...overrides, DB };

  return {
    env,
    dispose: () => {
      sqlite.close();
    },
  };
}
