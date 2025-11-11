import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { newDb } from "pg-mem";
import { vi } from "vitest";

const __dirnameLocal = dirname(fileURLToPath(import.meta.url));
const serviceRoot = resolve(__dirnameLocal, "..");

process.env.NODE_ENV = "test";
process.env.PORT = "8080";
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.CN_GATEWAY_BASE = "https://test.local";
process.env.KMS_PROVIDER = "dev";
process.env.DEV_KMS_KEY = "test-secret";
process.env.KMS_KEY_ALIAS = "test-key";
process.env.KMS_KEY_VERSION = "vtest";
process.env.EXPORT_ENABLED = "true";
process.env.APP_API_BASE = "http://127.0.0.1:49090";
process.env.EXPORT_PROFILE_ID = "test-profile";
process.env.EXPORT_SIGNING_KEY_PATH = resolve(serviceRoot, "test/fixtures/export-ed25519.key");
process.env.EXPORT_BATCH_SIZE = "10";
process.env.EXPORT_FLUSH_INTERVAL_MS = "200";
process.env.RATE_LIMIT_RPM_DEVICE = "2";
process.env.IDEMPOTENCY_TTL_HOURS = "24";
process.env.TIMESTAMP_SKEW_SECS = "120";
process.env.LOG_LEVEL = "silent";
process.env.METRICS_ENABLED = "true";

const mem = newDb();
mem.public.registerFunction({
  name: "char_length",
  args: ["text"],
  returns: "int4",
  implementation: (value: string) => (value ?? "").length
});
const migration = readFileSync(resolve(serviceRoot, "migrations/001_init.sql"), "utf8");
mem.public.none(migration);
const adapter = mem.adapters.createPg();

vi.mock("pg", () => {
  return { Pool: adapter.Pool };
});

const exportRequests: Array<{ url: string; body: string; headers: Record<string, string> }> = [];

vi.mock("undici", () => {
  return {
    fetch: async (url: string | URL, init?: { headers?: Record<string, string>; body?: string | Buffer }) => {
      exportRequests.push({
        url: typeof url === "string" ? url : url.toString(),
        body: typeof init?.body === "string" ? init.body : init?.body?.toString("utf8") ?? "",
        headers: init?.headers ?? {}
      });
      return {
        status: 202,
        ok: true,
        json: async () => ({}),
        text: async () => "",
        arrayBuffer: async () => new ArrayBuffer(0)
      } as unknown as Response;
    }
  };
});

(globalThis as unknown as { __PG_MEM__?: ReturnType<typeof newDb>; __EXPORT_REQUESTS__?: typeof exportRequests }).__PG_MEM__ =
  mem;
(globalThis as unknown as { __EXPORT_REQUESTS__?: typeof exportRequests }).__EXPORT_REQUESTS__ = exportRequests;
