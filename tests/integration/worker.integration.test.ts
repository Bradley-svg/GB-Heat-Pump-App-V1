import "../helpers/setup";

import { createHash } from "node:crypto";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";

import { hmacSha256Hex } from "../../src/utils";
import { createWorkerEnv } from "../helpers/worker-env";

const TEST_TIMEOUT = 15_000;

describe.sequential("Worker integration", () => {
  let handleFleetSummary: typeof import("../../src/routes/fleet").handleFleetSummary;
  let handleIngest: typeof import("../../src/routes/ingest").handleIngest;
  let requireAccessUserSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeAll(async () => {
  const accessModule = await import("../../src/lib/access");
  requireAccessUserSpy = vi
    .spyOn(accessModule, "requireAccessUser")
    .mockResolvedValue({
      email: "admin@example.com",
      roles: ["admin"],
      clientIds: ["profile-west", "profile-east"],
    });
  ({ handleFleetSummary } = await import("../../src/routes/fleet"));
  ({ handleIngest } = await import("../../src/routes/ingest"));
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
