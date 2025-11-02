import "../helpers/setup";

import { createHash } from "node:crypto";
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";

import workerApp from "../../src/app";
import type { User } from "../../src/env";
import { hmacSha256Hex } from "../../src/utils";
import { verifyDeviceKey } from "../../src/lib/device";
import { createWorkerEnv } from "../helpers/worker-env";

const BASE_URL = "https://example.com";

function makeRequest(path: string, init?: RequestInit) {
  return new Request(`${BASE_URL}${path}`, init);
}

describe.sequential("API flows via Miniflare", () => {
  const adminUser: User = {
    email: "admin.integration@example.com",
    roles: ["admin"],
    clientIds: ["profile-west", "profile-east"],
  };
  const tenantUser: User = {
    email: "tenant.integration@example.com",
    roles: ["client"],
    clientIds: ["profile-west"],
  };

  let currentUser: User | null = adminUser;
  let requireAccessUserSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeAll(async () => {
    const accessModule = await import("../../src/lib/access");
    requireAccessUserSpy = vi
      .spyOn(accessModule, "requireAccessUser")
      .mockImplementation(async () => currentUser);
  });

  beforeEach(() => {
    currentUser = adminUser;
  });

  afterAll(() => {
    requireAccessUserSpy?.mockRestore();
  });

  it("enforces Access scoping for devices and telemetry flows", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const now = Date.now();
      const telemetryRows = [
        {
          ts: now - 10 * 60 * 1000,
          metrics: { supplyC: 47.1, returnC: 40.2, flowLps: 0.31, powerKW: 1.2 },
          deltaT: 6.9,
          thermalKW: 5.31,
          cop: 4.42,
        },
        {
          ts: now - 4 * 60 * 1000,
          metrics: { supplyC: 48.4, returnC: 39.6, flowLps: 0.29, powerKW: 1.18 },
          deltaT: 8.8,
          thermalKW: 6.05,
          cop: 5.12,
        },
      ];

      for (const row of telemetryRows) {
        await env.DB.prepare(
          `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
        )
          .bind(
            "dev-1001",
            row.ts,
            JSON.stringify(row.metrics),
            row.deltaT,
            row.thermalKW,
            row.cop,
            "measured",
            JSON.stringify({ mode: "heating" }),
            "[]",
          )
          .run();
      }

      currentUser = adminUser;
      const adminDevicesRes = await workerApp.fetch(makeRequest("/api/devices"), env);
      const adminDevices = (await adminDevicesRes.json()) as {
        items: Array<{ device_id: string; lookup: string }>;
      };
      if (adminDevicesRes.status !== 200) {
        throw new Error(
          `/api/devices (admin) returned ${adminDevicesRes.status}: ${JSON.stringify(adminDevices)}`,
        );
      }
      const adminIds = adminDevices.items.map((item) => item.device_id);
      expect(adminIds).toContain("dev-1001");
      expect(adminIds).toContain("dev-1002");

      currentUser = tenantUser;
      const tenantDevicesRes = await workerApp.fetch(makeRequest("/api/devices"), env);
      const tenantDevices = (await tenantDevicesRes.json()) as {
        items: Array<{ device_id: string; lookup: string; profile_id: string | null }>;
      };
      if (tenantDevicesRes.status !== 200) {
        throw new Error(
          `/api/devices (tenant) returned ${tenantDevicesRes.status}: ${JSON.stringify(tenantDevices)}`,
        );
      }
      expect(tenantDevices.items.length).toBe(1);
      const tenantDevice = tenantDevices.items[0];
      expect(tenantDevice.profile_id).toBe("profile-west");
      expect(tenantDevice.device_id).not.toBe("dev-1001");
      expect(tenantDevice.device_id).toContain("***");
      expect(tenantDevice.lookup).toMatch(/^enc\./);

      const rawLatestRes = await workerApp.fetch(
        makeRequest("/api/telemetry/latest-batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ devices: ["dev-1001"] }),
        }),
        env,
      );
      expect(rawLatestRes.status).toBe(200);
      const rawLatestPayload = (await rawLatestRes.json()) as { items: unknown[]; missing: string[] };
      expect(rawLatestPayload.items).toHaveLength(0);
      expect(rawLatestPayload.missing).toContain("dev-1001");

      const latestRes = await workerApp.fetch(
        makeRequest("/api/telemetry/latest-batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ devices: [tenantDevice.lookup] }),
        }),
        env,
      );
      expect(latestRes.status).toBe(200);
      const latestPayload = (await latestRes.json()) as {
        items: Array<{
          device_id: string;
          lookup: string;
          latest: Record<string, unknown>;
        }>;
      };
      expect(latestPayload.items).toHaveLength(1);
      const latestItem = latestPayload.items[0];
      expect(latestItem.device_id).toContain("***");
      expect(latestItem.lookup).toMatch(/^enc\./);
      expect(latestItem.latest).toMatchObject({
        online: expect.any(Boolean),
        mode: expect.anything(),
      });

      const startIso = new Date(now - 15 * 60 * 1000).toISOString();
      const endIso = new Date(now + 60_000).toISOString();

      const rawSeriesRes = await workerApp.fetch(
        makeRequest(
          `/api/telemetry/series?scope=device&device=dev-1001&interval=5m&start=${encodeURIComponent(
            startIso,
          )}&end=${encodeURIComponent(endIso)}`,
        ),
        env,
      );
      expect(rawSeriesRes.status).toBe(404);

      const tenantSeriesRes = await workerApp.fetch(
        makeRequest(
          `/api/telemetry/series?scope=device&device=${encodeURIComponent(
            tenantDevice.lookup,
          )}&interval=5m&start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`,
        ),
        env,
      );
      expect(tenantSeriesRes.status).toBe(200);
      const tenantSeriesPayload = (await tenantSeriesRes.json()) as {
        scope: { device_id: string; lookup: string };
        series: Array<{
          bucket_start: string;
          sample_count: number;
          values: Record<string, { avg: number | null; min?: number | null; max?: number | null }>;
        }>;
      };
      expect(tenantSeriesPayload.scope.device_id).toContain("***");
      expect(tenantSeriesPayload.scope.lookup).toMatch(/^enc\./);
      expect(tenantSeriesPayload.series.length).toBeGreaterThan(0);
      const firstBucket = tenantSeriesPayload.series[0];
      expect(typeof firstBucket.sample_count).toBe("number");
      expect(firstBucket.values.deltaT?.avg).toBeTypeOf("number");

      currentUser = adminUser;
      const adminSeriesRes = await workerApp.fetch(
        makeRequest(
          `/api/telemetry/series?scope=device&device=dev-1001&interval=5m&start=${encodeURIComponent(
            startIso,
          )}&end=${encodeURIComponent(endIso)}`,
        ),
        env,
      );
      expect(adminSeriesRes.status).toBe(200);
      const adminSeriesPayload = (await adminSeriesRes.json()) as {
        scope: { device_id: string; lookup: string };
      };
      expect(adminSeriesPayload.scope.device_id).toBe("dev-1001");
      expect(adminSeriesPayload.scope.lookup).toBe("dev-1001");
    } finally {
      dispose();
    }
  });

  it("supports full alert lifecycle actions with audit trail", async () => {
    const { env, dispose } = await createWorkerEnv();
    currentUser = adminUser;

    try {
      const acknowledgeRes = await workerApp.fetch(
        makeRequest("/api/alerts/alert-0001", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "acknowledge", comment: "Acknowledged by integration test" }),
        }),
        env,
      );
      expect(acknowledgeRes.status).toBe(200);
      const acknowledgeBody = (await acknowledgeRes.json()) as {
        ok: boolean;
        alert: { status: string; acknowledged_at: string | null };
        comment: { action: string } | null;
      };
      expect(acknowledgeBody.ok).toBe(true);
      expect(acknowledgeBody.alert.status).toBe("acknowledged");
      expect(acknowledgeBody.comment?.action).toBe("acknowledge");

      const assignRes = await workerApp.fetch(
        makeRequest("/api/alerts/alert-0001", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "assign", assignee: "tech.integration", comment: "Taking ownership" }),
        }),
        env,
      );
      expect(assignRes.status).toBe(200);
      const assignBody = (await assignRes.json()) as {
        alert: { assigned_to: string | null };
        comment: { metadata?: { assignee?: string } } | null;
      };
      expect(assignBody.alert.assigned_to).toBe("tech.integration");
      expect(assignBody.comment?.metadata?.assignee).toBe("tech.integration");

      const resolveRes = await workerApp.fetch(
        makeRequest("/api/alerts/alert-0001", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "resolve", comment: "Resolved after reboot" }),
        }),
        env,
      );
      expect(resolveRes.status).toBe(200);
      const resolveBody = (await resolveRes.json()) as {
        alert: { status: string; resolved_by: string | null; resolved_at: string | null };
      };
      expect(resolveBody.alert.status).toBe("resolved");
      expect(resolveBody.alert.resolved_by).toBe(adminUser.email);
      expect(resolveBody.alert.resolved_at).toBeTruthy();

      const commentRes = await workerApp.fetch(
        makeRequest("/api/alerts/alert-0001/comments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ comment: "Follow-up note from integration test" }),
        }),
        env,
      );
      expect(commentRes.status).toBe(200);
      const commentBody = (await commentRes.json()) as {
        alert: { comments: Array<{ body: string }> };
        comment: { action: string; body: string | null };
      };
      expect(commentBody.comment.action).toBe("comment");
      expect(commentBody.comment.body).toBe("Follow-up note from integration test");
      expect(commentBody.alert.comments.some((c) => c.body === "Follow-up note from integration test")).toBe(true);

      const listRes = await workerApp.fetch(makeRequest("/api/alerts?limit=5"), env);
      expect(listRes.status).toBe(200);
      const listBody = (await listRes.json()) as { items: Array<{ alert_id: string; status: string }> };
      const updated = listBody.items.find((item) => item.alert_id === "alert-0001");
      expect(updated?.status).toBe("resolved");

      const auditRows = await env.DB.prepare(
        `SELECT action FROM audit_trail WHERE entity_type = 'alert' AND entity_id = ?1 ORDER BY created_at ASC`,
      )
        .bind("alert-0001")
        .all<{ action: string }>();
      const actions = (auditRows.results ?? []).map((row) => row.action);
      expect(actions).toEqual([
        "alert.acknowledge",
        "alert.assign",
        "alert.resolve",
        "alert.commented",
      ]);
    } finally {
      dispose();
    }
  });

  it("validates ingest signatures and enforces rate limits", async () => {
    const { env, dispose } = await createWorkerEnv({ INGEST_RATE_LIMIT_PER_MIN: "1" });
    try {
      const rawSecret = "ingest-integration-secret";
      const secretHash = createHash("sha256").update(rawSecret).digest("hex");
      await env.DB.prepare(`UPDATE devices SET device_key_hash=?1 WHERE device_id=?2`)
        .bind(secretHash, "dev-1001")
        .run();

      const verification = await verifyDeviceKey(env, "dev-1001", rawSecret);
      expect(verification.ok).toBe(true);
      const deviceKeyHash = verification.deviceKeyHash!;

      const baseBody = {
        device_id: "dev-1001",
        ts: new Date().toISOString(),
        metrics: {
          supplyC: 49.2,
          returnC: 37.1,
          tankC: 41.3,
          ambientC: 18.9,
          flowLps: 0.35,
          compCurrentA: 11.8,
          eevSteps: 315,
          powerKW: 1.25,
          mode: "heating",
          defrost: 0,
        },
        faults: ["low_flow"],
        rssi: -51,
      };

      const missingSignatureRes = await workerApp.fetch(
        makeRequest("/api/ingest/profile-west", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "X-GREENBRO-DEVICE-KEY": rawSecret,
            "X-GREENBRO-TIMESTAMP": baseBody.ts,
          },
          body: JSON.stringify(baseBody),
        }),
        env,
      );
      expect(missingSignatureRes.status).toBe(401);
      const missingPayload = (await missingSignatureRes.json()) as { error: string };
      expect(missingPayload.error).toBe("Missing signature headers");

      async function sendSigned(bodyOverride?: Partial<typeof baseBody>) {
        const body = { ...baseBody, ...bodyOverride };
        if (bodyOverride?.ts === undefined) {
          body.ts = new Date().toISOString();
        }
        const bodyJson = JSON.stringify(body);
        const signature = await hmacSha256Hex(deviceKeyHash, `${body.ts}.${bodyJson}`);
        return workerApp.fetch(
          makeRequest("/api/ingest/profile-west", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "X-GREENBRO-DEVICE-KEY": rawSecret,
              "X-GREENBRO-TIMESTAMP": body.ts,
              "X-GREENBRO-SIGNATURE": signature,
            },
            body: bodyJson,
          }),
          env,
        );
      }

      const okRes = await sendSigned();
      expect(okRes.status).toBe(200);
      const okPayload = (await okRes.json()) as { ok: boolean };
      expect(okPayload.ok).toBe(true);

      const latestRow = await env.DB.prepare(
        `SELECT deltaT, thermalKW, cop, faults_json FROM latest_state WHERE device_id=?1`,
      )
        .bind("dev-1001")
        .first<{ deltaT: number; thermalKW: number; cop: number; faults_json: string }>();
      expect(latestRow).toBeTruthy();
      expect(latestRow?.faults_json).toContain("low_flow");

      const rateLimitedRes = await sendSigned();
      expect(rateLimitedRes.status).toBe(429);
      const ratePayload = (await rateLimitedRes.json()) as { error: string };
      expect(ratePayload.error).toBe("Rate limit exceeded");
    } finally {
      dispose();
    }
  });
});
