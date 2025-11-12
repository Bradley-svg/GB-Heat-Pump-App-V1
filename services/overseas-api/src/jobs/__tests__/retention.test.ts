import { afterEach, describe, expect, it, vi } from "vitest";

import { runTelemetryRetention } from "../../jobs/retention";
import { createWorkerEnv } from "../../../tests/helpers/worker-env";
import { createMockR2Bucket } from "../../../tests/helpers/mock-r2";

async function insertTelemetry(env: Awaited<ReturnType<typeof createWorkerEnv>>["env"], row: {
  device_id: string;
  ts: number;
  metrics_json?: string;
  deltaT?: number | null;
  thermalKW?: number | null;
  cop?: number | null;
  cop_quality?: string | null;
  status_json?: string | null;
  faults_json?: string | null;
}) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO devices (
        device_id, profile_id, device_key_hash, site, firmware, map_version, online, last_seen_at
      ) VALUES (?1, NULL, NULL, NULL, NULL, NULL, 1, CURRENT_TIMESTAMP)`,
  )
    .bind(row.device_id)
    .run();

  return env.DB.prepare(
    `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(
      row.device_id,
      row.ts,
      row.metrics_json ?? JSON.stringify({ powerKW: 1.2 }),
      row.deltaT ?? null,
      row.thermalKW ?? null,
      row.cop ?? null,
      row.cop_quality ?? null,
      row.status_json ?? "[]",
      row.faults_json ?? "[]",
    )
    .run();
}

function insertOpsMetric(env: Awaited<ReturnType<typeof createWorkerEnv>>["env"], row: {
  ts: string;
  route?: string;
}) {
  return env.DB.prepare(
    `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  )
    .bind(
      row.ts,
      row.route ?? "/api/test",
      200,
      10,
      null,
    )
    .run();
}

async function insertClientEvent(
  env: Awaited<ReturnType<typeof createWorkerEnv>>["env"],
  row: { created_at: string; email: string },
) {
  const id = `evt-${Math.random().toString(36).slice(2)}`;
  await env.DB.prepare(
    `INSERT INTO client_events (id, created_at, event, source, user_email, dimension, properties)
     VALUES (?1, ?2, 'signup_flow.result', 'test', ?3, 'pending_verification', '{}')`,
  )
    .bind(id, row.created_at, row.email)
    .run();
}

describe("runTelemetryRetention", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("backs up and removes telemetry rows older than the retention threshold", async () => {
    const now = new Date("2025-11-03T00:00:00Z");
    const oldMs = now.getTime() - 120 * 24 * 60 * 60 * 1000;
    const oldIso = new Date(oldMs).toISOString();
    const freshMs = now.getTime() - 10 * 24 * 60 * 60 * 1000;
    const freshIso = new Date(freshMs).toISOString();

    const archive = createMockR2Bucket();
    const { env, dispose } = await createWorkerEnv({
      TELEMETRY_RETENTION_DAYS: "90",
      RETENTION_ARCHIVE: archive.bucket,
      RETENTION_BACKUP_PREFIX: "retention-tests",
    });

    await insertTelemetry(env, { device_id: "dev-old", ts: oldMs });
    await insertTelemetry(env, { device_id: "dev-fresh", ts: freshMs });

    await insertOpsMetric(env, { ts: oldIso });
    await insertOpsMetric(env, { ts: freshIso });
    await insertClientEvent(env, { created_at: oldIso, email: "old@example.com" });
    await insertClientEvent(env, { created_at: freshIso, email: "fresh@example.com" });

    const summary = await runTelemetryRetention(env, { now });

    const oldTelemetry = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM telemetry WHERE device_id = 'dev-old'`,
    ).first<{ cnt: number }>();
    const freshTelemetry = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM telemetry WHERE device_id = 'dev-fresh'`,
    ).first<{ cnt: number }>();

    const oldOps = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM ops_metrics WHERE ts = ?1`,
    )
      .bind(oldIso)
      .first<{ cnt: number }>();
    const newOps = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM ops_metrics WHERE ts = ?1`,
    )
      .bind(freshIso)
      .first<{ cnt: number }>();

    const oldClientEvents = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM client_events WHERE user_email = ?1`,
    )
      .bind("old@example.com")
      .first<{ cnt: number }>();
    const freshClientEvents = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM client_events WHERE user_email = ?1`,
    )
      .bind("fresh@example.com")
      .first<{ cnt: number }>();

    expect(summary.telemetry.deleted).toBe(1);
    expect(summary.opsMetricsDeleted).toBe(1);
    expect(summary.clientEventsDeleted).toBe(1);
    expect(summary.clientEventRetentionDays).toBe(60);

    expect(oldTelemetry?.cnt ?? 0).toBe(0);
    expect(freshTelemetry?.cnt ?? 0).toBe(1);

    expect(oldOps?.cnt ?? 0).toBe(0);
    expect(newOps?.cnt ?? 0).toBe(1);

    expect(oldClientEvents?.cnt ?? 0).toBe(0);
    expect(freshClientEvents?.cnt ?? 0).toBe(1);

    const keys = archive.listKeys();
    expect(keys.length).toBeGreaterThanOrEqual(1);
    const telemetryKey = keys.find((key) => key.includes("/telemetry/"));
    expect(telemetryKey).toBeTruthy();
    const telemetryBackup = telemetryKey ? await archive.readText(telemetryKey) : null;
    expect(telemetryBackup?.trim().split("\n")).toHaveLength(1);

    dispose();
  });

  it("refuses to delete when backup is required but no archive bucket is configured", async () => {
    const now = new Date("2025-11-03T00:00:00Z");
    const oldMs = now.getTime() - 120 * 24 * 60 * 60 * 1000;

    const { env, dispose } = await createWorkerEnv({
      TELEMETRY_RETENTION_DAYS: "90",
      RETENTION_BACKUP_BEFORE_DELETE: "true",
    });

    await insertTelemetry(env, { device_id: "dev-old", ts: oldMs });

    await expect(runTelemetryRetention(env, { now })).rejects.toThrowError("requires backup");

    const remaining = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM telemetry WHERE device_id = 'dev-old'`,
    ).first<{ cnt: number }>();
    expect(remaining?.cnt ?? 0).toBe(1);

    dispose();
  });
});
