import "../helpers/setup";

import { createHash } from "node:crypto";
import { describe, expect, it, beforeAll, beforeEach, afterAll, vi } from "vitest";

import { hmacSha256Hex } from "../../src/utils";
import { sealCursorId } from "../../src/lib/cursor";
import type { User } from "../../src/env";
import { createWorkerEnv } from "../helpers/worker-env";

const TEST_TIMEOUT = 15_000;

describe.sequential("Worker integration", () => {
  const adminUser: User = {
    email: "admin@example.com",
    roles: ["admin"],
    clientIds: ["profile-west", "profile-east"],
  };
  const tenantUser: User = {
    email: "operator@example.com",
    roles: ["client"],
    clientIds: ["profile-west"],
  };

  let currentUser: User | null = adminUser;
  let handleFleetSummary: typeof import("../../src/routes/fleet").handleFleetSummary;
  let handleIngest: typeof import("../../src/routes/ingest").handleIngest;
  let handleRequest: typeof import("../../src/router").handleRequest;
  let requireAccessUserSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeAll(async () => {
    const accessModule = await import("../../src/lib/access");
    requireAccessUserSpy = vi
      .spyOn(accessModule, "requireAccessUser")
      .mockImplementation(async () => currentUser);
    ({ handleFleetSummary } = await import("../../src/routes/fleet"));
    ({ handleIngest } = await import("../../src/routes/ingest"));
    ({ handleRequest } = await import("../../src/router"));
  });

  beforeEach(() => {
    currentUser = adminUser;
  });

  afterAll(() => {
    requireAccessUserSpy?.mockRestore();
  });

  it("computes fleet summary with seeded telemetry data", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const now = Date.now();

      await env.DB.prepare(
        `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      ).bind(
        "dev-1001",
        now - 30_000,
        JSON.stringify({ supplyC: 47, returnC: 38, flowLps: 0.32, powerKW: 1.4 }),
        9,
        12.07,
        3.5,
        "measured",
        JSON.stringify({ mode: "heating", defrost: 0, rssi: -52 }),
        "[]",
      ).run();

      await env.DB.prepare(
        `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      ).bind(
        "dev-1002",
        now - 45_000,
        JSON.stringify({ supplyC: 21, returnC: 19.8, flowLps: 0.18, powerKW: 1.1 }),
        1.2,
        0.9,
        2.0,
        "measured",
        JSON.stringify({ mode: "idle", defrost: 0, rssi: -60 }),
        "[]",
      ).run();

      const request = new Request("https://example.com/api/fleet/summary?hours=72&lowDeltaT=2");

      const response = await handleFleetSummary(request, env);
      expect(response.status).toBe(200);
      const payload = (await response.json()) as Record<string, unknown>;

      expect(payload.devices_total).toBe(2);
      expect(payload.devices_online).toBe(1);
      expect(payload.avg_cop_24h).toBeCloseTo(2.75, 2);
      expect(payload.low_deltaT_count_24h).toBe(1);
      expect(typeof payload.max_heartbeat_age_sec === "number" || payload.max_heartbeat_age_sec === null).toBe(true);
      expect(payload.window_start_ms).toBeTypeOf("number");
    } finally {
      dispose();
    }
  }, TEST_TIMEOUT);

  it("enforces tenant scope and masks data for telemetry latest batch", async () => {
    currentUser = tenantUser;
    const { env, dispose } = await createWorkerEnv();
    try {
      await env.DB.prepare(
        `UPDATE latest_state
           SET supplyC=?1,
               returnC=?2,
               flowLps=?3,
               compCurrentA=?4,
               powerKW=?5,
               deltaT=?6,
               thermalKW=?7,
               cop=?8
         WHERE device_id=?9`,
      )
        .bind(
          45.347,
          39.812,
          0.28751,
          10.234,
          1.3579,
          5.4321,
          4.6543,
          3.3471,
          "dev-1001",
        )
        .run();

      const allowedToken = await sealCursorId(env, "dev-1001");
      const forbiddenToken = await sealCursorId(env, "dev-1002");

      const request = new Request("https://example.com/api/telemetry/latest-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          devices: [allowedToken, forbiddenToken],
        }),
      });

      const response = await handleRequest(request, env);
      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        items: Array<{
          device_id: string;
          profile_id: string | null;
          lookup: string;
          latest: Record<string, unknown>;
        }>;
        missing: string[];
      };

      expect(payload.items).toHaveLength(1);
      const [item] = payload.items;
      expect(item.profile_id).toBe("profile-west");
      expect(item.device_id).not.toBe("dev-1001");
      expect(item.lookup).toMatch(/^enc\./);

      const latest = item.latest as Record<string, number | null>;
      expect(latest.supplyC).toBeCloseTo(45.3, 1);
      expect(latest.returnC).toBeCloseTo(39.8, 1);
      expect(latest.flowLps).toBeCloseTo(0.288, 3);
      expect(latest.compCurrentA).toBeCloseTo(10.23, 2);
      expect(latest.powerKW).toBeCloseTo(1.358, 3);
      expect(latest.deltaT).toBeCloseTo(5.43, 2);
      expect(latest.thermalKW).toBeCloseTo(4.654, 3);
      expect(latest.cop).toBeCloseTo(3.35, 2);

      expect(payload.missing).toContain(forbiddenToken);
      expect(payload.missing).not.toContain(allowedToken);
    } finally {
      dispose();
    }
  }, TEST_TIMEOUT);

  it("aggregates telemetry series buckets and blocks unauthorized devices", async () => {
    currentUser = tenantUser;
    const { env, dispose } = await createWorkerEnv();
    try {
      await env.DB.prepare(
        `DELETE FROM telemetry WHERE device_id IN (?1, ?2)`,
      ).bind("dev-1001", "dev-1002").run();

      const base = Date.parse("2025-01-02T08:30:00.000Z");
      const rows = [
        {
          ts: base,
          deltaT: 5.4,
          thermalKW: 4.3,
          cop: 2.9,
          supplyC: 45.1,
          returnC: 39.7,
          flowLps: 0.32,
          powerKW: 1.5,
        },
        {
          ts: base + 120_000,
          deltaT: 5.6,
          thermalKW: 4.5,
          cop: 3.1,
          supplyC: 45.5,
          returnC: 39.9,
          flowLps: 0.31,
          powerKW: 1.4,
        },
        {
          ts: base + 300_000,
          deltaT: 6.0,
          thermalKW: 4.6,
          cop: 3.0,
          supplyC: 45.0,
          returnC: 39.0,
          flowLps: 0.3,
          powerKW: 1.6,
        },
      ];

      for (const row of rows) {
        await env.DB.prepare(
          `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
        )
          .bind(
            "dev-1001",
            row.ts,
            JSON.stringify({
              supplyC: row.supplyC,
              returnC: row.returnC,
              flowLps: row.flowLps,
              powerKW: row.powerKW,
            }),
            row.deltaT,
            row.thermalKW,
            row.cop,
            "measured",
            "{}",
            "[]",
          )
          .run();
      }

      const allowedToken = await sealCursorId(env, "dev-1001");
      const forbiddenToken = await sealCursorId(env, "dev-1002");

      const start = new Date(base - 60_000).toISOString();
      const end = new Date(base + 600_000).toISOString();

      const allowedUrl = new URL("https://example.com/api/telemetry/series");
      allowedUrl.searchParams.set("scope", "device");
      allowedUrl.searchParams.set("device", allowedToken);
      allowedUrl.searchParams.set("interval", "5m");
      allowedUrl.searchParams.set("start", start);
      allowedUrl.searchParams.set("end", end);

      const allowedResponse = await handleRequest(new Request(allowedUrl.toString()), env);
      expect(allowedResponse.status).toBe(200);
      const allowedPayload = (await allowedResponse.json()) as {
        interval_ms: number;
        scope: { device_id: string; lookup: string };
        series: Array<{
          bucket_start: string;
          sample_count: number;
          values: Record<string, { avg: number | null; min?: number | null; max?: number | null }>;
        }>;
      };

      expect(allowedPayload.interval_ms).toBe(300_000);
      expect(allowedPayload.scope.device_id).not.toBe("dev-1001");
      expect(allowedPayload.scope.lookup).toMatch(/^enc\./);
      expect(allowedPayload.series).toHaveLength(2);

      const firstBucket = allowedPayload.series[0];
      expect(firstBucket.sample_count).toBe(2);
      expect(firstBucket.values.deltaT.avg).toBeCloseTo(5.5, 2);
      expect(firstBucket.values.deltaT.min).toBeCloseTo(5.4, 2);
      expect(firstBucket.values.deltaT.max).toBeCloseTo(5.6, 2);
      expect(firstBucket.values.thermalKW.avg).toBeCloseTo(4.4, 2);
      expect(firstBucket.values.cop.avg).toBeCloseTo(3.0, 2);
      expect(firstBucket.values.flowLps.avg).toBeCloseTo(0.32, 2);
      expect(firstBucket.values.powerKW.avg).toBeCloseTo(1.45, 2);

      const secondBucket = allowedPayload.series[1];
      expect(secondBucket.sample_count).toBe(1);
      expect(secondBucket.values.deltaT.avg).toBeCloseTo(6.0, 2);
      expect(secondBucket.values.thermalKW.avg).toBeCloseTo(4.6, 2);
      expect(secondBucket.values.cop.avg).toBeCloseTo(3.0, 2);

      const forbiddenUrl = new URL("https://example.com/api/telemetry/series");
      forbiddenUrl.searchParams.set("scope", "device");
      forbiddenUrl.searchParams.set("device", forbiddenToken);
      forbiddenUrl.searchParams.set("interval", "5m");
      forbiddenUrl.searchParams.set("start", start);
      forbiddenUrl.searchParams.set("end", end);

      const forbiddenResponse = await handleRequest(new Request(forbiddenUrl.toString()), env);
      expect(forbiddenResponse.status).toBe(403);
    } finally {
      dispose();
    }
  }, TEST_TIMEOUT);
  it("accepts telemetry ingest and updates latest state", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const rawSecret = "dev-1001-secret";
      const secretHash = createHash("sha256").update(rawSecret).digest("hex");

      await env.DB.prepare(
        `UPDATE devices SET device_key_hash=?1 WHERE device_id=?2`,
      ).bind(secretHash, "dev-1001").run();

      const timestamp = new Date().toISOString();
      const body = {
        device_id: "dev-1001",
        ts: timestamp,
        metrics: {
          supplyC: 48.5,
          returnC: 36.2,
          tankC: 40.1,
          ambientC: 18.4,
          flowLps: 0.34,
          compCurrentA: 11.2,
          eevSteps: 320,
          powerKW: 1.28,
          mode: "heating",
          defrost: 0,
        },
        faults: ["low_flow"],
        rssi: -50,
      };

      const bodyJson = JSON.stringify(body);
      const signature = await hmacSha256Hex(secretHash, `${timestamp}.${bodyJson}`);

      const request = new Request("https://example.com/api/ingest/profile-west", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-GREENBRO-DEVICE-KEY": rawSecret,
          "X-GREENBRO-TIMESTAMP": timestamp,
          "X-GREENBRO-SIGNATURE": signature,
        },
        body: bodyJson,
      });

      const response = await handleIngest(request, env, "profile-west");
      expect(response.status).toBe(200);
      const payload = (await response.json()) as Record<string, unknown>;
      expect(payload.ok).toBe(true);

      const latest = await env.DB.prepare(
        `SELECT supplyC, returnC, deltaT, thermalKW, cop, faults_json FROM latest_state WHERE device_id=?1`,
      ).bind("dev-1001").first<{
        supplyC: number;
        returnC: number;
        deltaT: number;
        thermalKW: number;
        cop: number;
        faults_json: string;
      }>();

      expect(latest).toBeTruthy();
      expect(latest?.supplyC).toBeCloseTo(48.5, 5);
      expect(latest?.returnC).toBeCloseTo(36.2, 5);
      expect(latest?.deltaT).toBeCloseTo(12.3, 1);
      expect(latest?.thermalKW).toBeGreaterThan(0);
      expect(latest?.cop).toBeGreaterThan(1);
      expect(latest?.faults_json).toBe("[\"low_flow\"]");

      const telemetryCount = await env.DB.prepare(
        `SELECT COUNT(*) AS cnt FROM telemetry WHERE device_id=?1`,
      ).bind("dev-1001").first<{ cnt: number }>();
      expect((telemetryCount?.cnt ?? 0)).toBeGreaterThan(0);
    } finally {
      dispose();
    }
  }, TEST_TIMEOUT);
});
