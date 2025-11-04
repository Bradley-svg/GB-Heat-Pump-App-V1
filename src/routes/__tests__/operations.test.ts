import { afterEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { D1Database, D1DatabaseAPI } from "@miniflare/d1";

import type { Env, User } from "../../env";
import * as accessModule from "../../lib/access";
import * as deviceModule from "../../lib/device";
import { sealCursorId } from "../../lib/cursor";
import { handleListAlertRecords, handleCreateAlertRecord } from "../alerts";
import { handleListCommissioningRuns, handleCreateCommissioningRun } from "../commissioning-runs";
import { handleListAuditTrail, handleCreateAuditEntry } from "../audit";
import {
  handleListMqttMappings,
  handleCreateMqttMapping,
  handleUpdateMqttMapping,
  handleDeleteMqttMapping,
} from "../mqtt";
import { handleOpsOverview } from "../ops";
import { OPS_METRICS_WINDOW_DAYS } from "../../lib/ops-metrics";

const requireAccessUserMock = vi.spyOn(accessModule, "requireAccessUser");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../../..");

const MIGRATIONS = [
  "migrations/001_init.sql",
  "migrations/0002_indexes.sql",
  "migrations/0003_operational_entities.sql",
  "migrations/0007_alert_lifecycle.sql",
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
    INGEST_ALLOWED_ORIGINS: "https://devices.example.com",
    INGEST_RATE_LIMIT_PER_MIN: "120",
    INGEST_SIGNATURE_TOLERANCE_SECS: "300",
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

  it("rejects users with client-admin style roles", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValueOnce({
      email: "alias@example.com",
      roles: ["client-admin"] as unknown as User["roles"],
      clientIds: [],
    });
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
      expect(body.ops_window).toMatchObject({
        start: expect.any(String),
        days: OPS_METRICS_WINDOW_DAYS,
      });
    } finally {
      sqlite.close();
    }
  });

  it("logs lookup failures but retains the affected recent row", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);
    const nowIso = new Date().toISOString();
    await env.DB
      .prepare(
        `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES (?1, ?2, ?3, ?4, ?5)`,
      )
      .bind(nowIso, "/api/failure-case", 500, 1200, "dev-1001")
      .run();

    const buildDeviceLookupSpy = vi
      .spyOn(deviceModule, "buildDeviceLookup")
      .mockRejectedValue(new Error("lookup failed"));

    try {
      const res = await handleOpsOverview(new Request("https://example.com/api/ops/overview?limit=5"), env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(Array.isArray(body.recent)).toBe(true);
      expect(body.recent.length).toBe(1);
      expect(body.recent[0]).toMatchObject({
        route: "/api/failure-case",
        device_id: "dev-1001",
        lookup: null,
      });
      expect(body.ops_summary?.total_requests).toBeGreaterThanOrEqual(1);
    } finally {
      buildDeviceLookupSpy.mockRestore();
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

  it("blocks non-admin users from managing MQTT mappings", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValue(TENANT_USER);

    try {
      const listRes = await handleListMqttMappings(
        new Request("https://example.com/api/mqtt/mappings?limit=5"),
        env,
      );
      expect(listRes.status).toBe(403);

      const createReq = new Request("https://example.com/api/mqtt/mappings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: "greenbro/dev-1001/test",
          direction: "egress",
        }),
      });
      const createRes = await handleCreateMqttMapping(createReq, env);
      expect(createRes.status).toBe(403);

      const updateReq = new Request("https://example.com/api/mqtt/mappings/mqtt-0001", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: "blocked" }),
      });
      const updateRes = await handleUpdateMqttMapping(updateReq, env, "mqtt-0001");
      expect(updateRes.status).toBe(403);

      const deleteRes = await handleDeleteMqttMapping(
        new Request("https://example.com/api/mqtt/mappings/mqtt-0001", { method: "DELETE" }),
        env,
        "mqtt-0001",
      );
      expect(deleteRes.status).toBe(403);
    } finally {
      sqlite.close();
    }
  });

  it("allows admins to paginate and perform CRUD on MQTT mappings with audit trail", async () => {
    const { env, sqlite } = createTestEnv();
    requireAccessUserMock.mockResolvedValue(ADMIN_USER);

    try {
      const firstPageRes = await handleListMqttMappings(
        new Request("https://example.com/api/mqtt/mappings?limit=1"),
        env,
      );
      expect(firstPageRes.status).toBe(200);
      const firstPageBody = (await firstPageRes.json()) as any;
      expect(firstPageBody.mappings).toHaveLength(1);
      expect(typeof firstPageBody.next).toBe("string");

      const secondPageRes = await handleListMqttMappings(
        new Request(`https://example.com/api/mqtt/mappings?limit=1&cursor=${firstPageBody.next}`),
        env,
      );
      expect(secondPageRes.status).toBe(200);
      const secondPageBody = (await secondPageRes.json()) as any;
      expect(secondPageBody.mappings.length).toBeGreaterThanOrEqual(1);

      const createReq = new Request("https://example.com/api/mqtt/mappings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mapping_id: "mqtt-test-1",
          device_id: "dev-1001",
          profile_id: "profile-west",
          topic: "greenbro/dev-1001/commands/test",
          direction: "ingress",
          qos: 0,
          transform: { mode: "eco" },
          description: "Integration mapping",
          enabled: true,
        }),
      });
      const createRes = await handleCreateMqttMapping(createReq, env);
      expect(createRes.status).toBe(201);
      const createdBody = (await createRes.json()) as any;
      expect(createdBody.mapping.mapping_id).toBe("mqtt-test-1");
      expect(createdBody.mapping.device_id).toBe("dev-1001");

      const updateReq = new Request("https://example.com/api/mqtt/mappings/mqtt-test-1", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description: "Updated integration mapping",
          enabled: false,
        }),
      });
      const updateRes = await handleUpdateMqttMapping(updateReq, env, "mqtt-test-1");
      expect(updateRes.status).toBe(200);
      const updatedBody = (await updateRes.json()) as any;
      expect(updatedBody.mapping.description).toBe("Updated integration mapping");
      expect(updatedBody.mapping.enabled).toBe(false);

      const deleteRes = await handleDeleteMqttMapping(
        new Request("https://example.com/api/mqtt/mappings/mqtt-test-1", { method: "DELETE" }),
        env,
        "mqtt-test-1",
      );
      expect(deleteRes.status).toBe(200);
      const deleteBody = (await deleteRes.json()) as any;
      expect(deleteBody.mapping.mapping_id).toBe("mqtt-test-1");

      const confirmRes = await handleListMqttMappings(
        new Request("https://example.com/api/mqtt/mappings?topic=commands%2Ftest"),
        env,
      );
      const confirmBody = (await confirmRes.json()) as any;
      expect(confirmBody.mappings.some((row: any) => row.mapping_id === "mqtt-test-1")).toBe(false);

      const auditRows = sqlite
        .prepare(
          `SELECT action FROM audit_trail WHERE entity_type = 'mqtt_mapping' AND entity_id = ? ORDER BY created_at ASC`,
        )
        .all("mqtt-test-1") as { action: string }[];
      expect(auditRows.map((row) => row.action)).toEqual([
        "mqtt.mapping.created",
        "mqtt.mapping.updated",
        "mqtt.mapping.deleted",
      ]);
    } finally {
      sqlite.close();
    }
  });
});

