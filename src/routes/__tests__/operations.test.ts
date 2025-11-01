import { afterEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { D1Database, D1DatabaseAPI } from "@miniflare/d1";

import type { Env, User } from "../../env";
import * as accessModule from "../../lib/access";
import { sealCursorId } from "../../lib/cursor";
import { handleListAlertRecords, handleCreateAlertRecord } from "../alerts";
import { handleListCommissioningRuns, handleCreateCommissioningRun } from "../commissioning-runs";
import { handleListAuditTrail, handleCreateAuditEntry } from "../audit";
import { handleListMqttMappings, handleCreateMqttMapping } from "../mqtt";
import { handleOpsOverview } from "../ops";

const requireAccessUserMock = vi.spyOn(accessModule, "requireAccessUser");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../..");

const MIGRATIONS = [
  "migrations/001_init.sql",
  "migrations/0002_indexes.sql",
  "migrations/0003_operational_entities.sql",
];

const DEV_SEED = "seeds/dev/seed.sql";

function readSql(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf-8");
}

function createTestEnv() {
  const sqlite = new Database(":memory:");
  for (const migration of MIGRATIONS) {
    sqlite.exec(readSql(migration));
  }
  sqlite.exec(readSql(DEV_SEED));

  const d1 = new D1Database(new D1DatabaseAPI(sqlite as any));
  const db = d1 as any;
  db.withSession = async (callback: (session: any) => Promise<any>) => {
    const session = {
      prepare: d1.prepare.bind(d1),
      batch: d1.batch.bind(d1),
    };
    return callback(session);
  };

  const env = {
    DB: db,
    ACCESS_JWKS_URL: "https://access.test/.well-known/jwks.json",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "https://example.com/app",
    RETURN_DEFAULT: "https://example.com",
    HEARTBEAT_INTERVAL_SECS: "30",
    OFFLINE_MULTIPLIER: "6",
    CURSOR_SECRET: "integration-secret-1234567890",
  } as unknown as Env;

  return { env, sqlite };
}

const ADMIN_USER: User = {
  email: "admin@example.com",
  roles: ["admin"],
  clientIds: [],
};

const TENANT_USER: User = {
  email: "ops@tenant.local",
  roles: ["client"],
  clientIds: ["profile-west"],
};

afterEach(() => {
  requireAccessUserMock.mockReset();
});

describe("handleOpsOverview", () => {
  it("requires authentication", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValueOnce(null);
    try {
      const res = await handleOpsOverview(new Request("https://example.com/api/ops/overview"), env);
      expect(res.status).toBe(401);
    } finally {
      sqlite.close();
    }
  });

  it("rejects non-admin users", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValueOnce(TENANT_USER);
    try {
      const res = await handleOpsOverview(new Request("https://example.com/api/ops/overview"), env);
      expect(res.status).toBe(403);
    } finally {
      sqlite.close();
    }
  });

  it("returns metrics summary and recent events for admins", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);
    try {
      const res = await handleOpsOverview(new Request("https://example.com/api/ops/overview?limit=5"), env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.scope).toBe("admin");
      expect(body.ops_summary?.total_requests).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(body.ops)).toBe(true);
      expect(Array.isArray(body.recent)).toBe(true);
      expect(body.recent.length).toBeLessThanOrEqual(5);
    } finally {
      sqlite.close();
    }
  });
});

describe("operations routes integration", () => {
  it("lists alerts with seeded data for admins", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValue(ADMIN_USER);
    try {
      const res = await handleListAlertRecords(
        new Request("https://example.com/api/alerts?limit=10"),
        env,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThanOrEqual(2);
      const first = body.items[0];
      expect(first).toMatchObject({
        alert_type: expect.any(String),
        severity: expect.any(String),
        status: expect.any(String),
        device_id: expect.any(String),
        lookup: expect.any(String),
      });
    } finally {
      sqlite.close();
    }
  });

  it("allows scoped tenants to create alerts with cursor device ids", async () => {
    const { env, sqlite } = createTestEnv();
    const deviceToken = await sealCursorId(env, "dev-1001");

    requireAccessUserMock
      .mockResolvedValueOnce(TENANT_USER)
      .mockResolvedValueOnce(ADMIN_USER);

    try {
      const createReq = new Request("https://example.com/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          device_id: deviceToken,
          alert_type: "sensor_fault",
          severity: "warning",
          status: "open",
          summary: "Created from integration test",
          metadata: { origin: "test" },
        }),
      });
      const createRes = await handleCreateAlertRecord(createReq, env);
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as any;
      expect(created.alert.summary).toBe("Created from integration test");
      expect(created.alert.profile_id).toBe("profile-west");

      const listRes = await handleListAlertRecords(
        new Request("https://example.com/api/alerts?limit=25"),
        env,
      );
      expect(listRes.status).toBe(200);
      const listBody = (await listRes.json()) as any;
      expect(listBody.items.some((item: any) => item.summary === "Created from integration test")).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("returns commissioning runs and allows inserting new runs", async () => {
    const { env, sqlite } = createTestEnv();
    const deviceToken = await sealCursorId(env, "dev-1001");

    requireAccessUserMock
      .mockResolvedValueOnce(ADMIN_USER)
      .mockResolvedValueOnce(TENANT_USER)
      .mockResolvedValueOnce(ADMIN_USER);

    try {
      const listRes = await handleListCommissioningRuns(
        new Request("https://example.com/api/commissioning/runs"),
        env,
      );
      expect(listRes.status).toBe(200);
      const listPayload = (await listRes.json()) as any;
      expect(Array.isArray(listPayload.runs)).toBe(true);
      expect(listPayload.runs.length).toBeGreaterThanOrEqual(2);

      const createReq = new Request("https://example.com/api/commissioning/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          device_id: deviceToken,
          status: "in_progress",
          checklist: ["power-on"],
          notes: "Tenant initiated run",
        }),
      });
      const createRes = await handleCreateCommissioningRun(createReq, env);
      expect(createRes.status).toBe(201);
      const createBody = (await createRes.json()) as any;
      expect(createBody.run.profile_id).toBe("profile-west");
      expect(createBody.run.checklist).toContain("power-on");

      const confirmRes = await handleListCommissioningRuns(
        new Request("https://example.com/api/commissioning/runs?limit=10"),
        env,
      );
      const confirmBody = (await confirmRes.json()) as any;
      expect(confirmBody.runs.some((run: any) => run.notes === "Tenant initiated run")).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("exposes audit trail and accepts new entries", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock
      .mockResolvedValueOnce(ADMIN_USER)
      .mockResolvedValueOnce(TENANT_USER)
      .mockResolvedValueOnce(ADMIN_USER);

    try {
      const listRes = await handleListAuditTrail(
        new Request("https://example.com/api/audit/logs?limit=5"),
        env,
      );
      expect(listRes.status).toBe(200);
      const listBody = (await listRes.json()) as any;
      expect(Array.isArray(listBody.entries)).toBe(true);
      expect(listBody.entries.length).toBeGreaterThanOrEqual(1);

      const createReq = new Request("https://example.com/api/audit/logs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actor_id: "tech-jane",
          actor_email: "tech.jane@example.com",
          action: "test.action",
          entity_type: "alert",
          entity_id: "alert-0001",
          metadata: { source: "integration-test" },
        }),
      });
      const createRes = await handleCreateAuditEntry(createReq, env);
      expect(createRes.status).toBe(201);
      const createBody = (await createRes.json()) as any;
      expect(createBody.audit.action).toBe("test.action");
      expect(createBody.audit.metadata?.source).toBe("integration-test");

      const confirmRes = await handleListAuditTrail(
        new Request("https://example.com/api/audit/logs?limit=10"),
        env,
      );
      const confirmBody = (await confirmRes.json()) as any;
      expect(confirmBody.entries.some((entry: any) => entry.action === "test.action")).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("manages MQTT mappings across tenants", async () => {
    const { env, sqlite } = createTestEnv();
    const deviceToken = await sealCursorId(env, "dev-1001");

    requireAccessUserMock
      .mockResolvedValueOnce(ADMIN_USER)
      .mockResolvedValueOnce(TENANT_USER)
      .mockResolvedValueOnce(ADMIN_USER);

    try {
      const listRes = await handleListMqttMappings(
        new Request("https://example.com/api/mqtt/mappings?limit=10"),
        env,
      );
      expect(listRes.status).toBe(200);
      const listBody = (await listRes.json()) as any;
      expect(Array.isArray(listBody.mappings)).toBe(true);
      expect(listBody.mappings.length).toBeGreaterThanOrEqual(2);

      const createReq = new Request("https://example.com/api/mqtt/mappings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          device_id: deviceToken,
          topic: "greenbro/dev-1001/commands/test",
          direction: "ingress",
          qos: 0,
          transform: { mode: "eco" },
          description: "Integration mapping",
        }),
      });
      const createRes = await handleCreateMqttMapping(createReq, env);
      expect(createRes.status).toBe(201);
      const createBody = (await createRes.json()) as any;
      expect(createBody.mapping.topic).toBe("greenbro/dev-1001/commands/test");
      expect(createBody.mapping.profile_id).toBe("profile-west");

      const confirmRes = await handleListMqttMappings(
        new Request("https://example.com/api/mqtt/mappings?limit=20"),
        env,
      );
      const confirmBody = (await confirmRes.json()) as any;
      expect(
        confirmBody.mappings.some(
          (mapping: any) => mapping.description === "Integration mapping",
        ),
      ).toBe(true);
    } finally {
      sqlite.close();
    }
  });
});

