import { afterEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../../env";
import { handleIngest } from "../ingest";
import * as deviceModule from "../../lib/device";

const verifyDeviceKeyMock = vi.spyOn(deviceModule, "verifyDeviceKey");
const claimDeviceIfUnownedMock = vi.spyOn(deviceModule, "claimDeviceIfUnowned");

function baseEnv(): Env {
  return {
    DB: {} as any,
    ACCESS_JWKS_URL: "",
    ACCESS_AUD: "",
    APP_BASE_URL: "",
    RETURN_DEFAULT: "",
    HEARTBEAT_INTERVAL_SECS: "30",
    OFFLINE_MULTIPLIER: "6",
    CURSOR_SECRET: "",
  };
}

afterEach(() => {
  verifyDeviceKeyMock.mockReset();
  claimDeviceIfUnownedMock.mockReset();
  vi.clearAllMocks();
});

describe("handleIngest", () => {
  it("returns 400 for malformed JSON", async () => {
    const env = baseEnv();
    const req = new Request("https://example.com/api/ingest/test", {
      method: "POST",
      body: "{bad-json",
      headers: { "content-type": "application/json" },
    });

    const res = await handleIngest(req, env, "test");
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.error).toBe("Invalid JSON");
  });

  it("returns 401 when device key verification fails", async () => {
    verifyDeviceKeyMock.mockResolvedValue(false);
    const env = baseEnv();
    const body = {
      device_id: "dev-123",
      ts: new Date().toISOString(),
      metrics: { supplyC: 10 },
    };
    const req = new Request("https://example.com/api/ingest/demo", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });

    const res = await handleIngest(req, env, "demo");
    expect(verifyDeviceKeyMock).toHaveBeenCalled();
    expect(res.status).toBe(401);
    const payload = await res.json();
    expect(payload.error).toBe("Unauthorized");
  });

  it("returns 200 for a valid payload", async () => {
    verifyDeviceKeyMock.mockResolvedValue(true);
    claimDeviceIfUnownedMock.mockResolvedValue({ ok: true });

    const selectFirst = vi.fn().mockResolvedValue({ profile_id: "demo" });

    const metricsInsert = { kind: "telemetry" };
    const latestInsert = { kind: "latest_state" };
    const deviceUpdate = { kind: "device_update" };
    const opsRun = vi.fn().mockResolvedValue(undefined);

    const prepare = vi.fn((sql: string) => {
      if (sql.includes("SELECT profile_id FROM devices")) {
        return {
          bind: vi.fn(() => ({
            first: selectFirst,
          })),
        };
      }

      if (sql.startsWith("INSERT INTO telemetry")) {
        return {
          bind: vi.fn(() => metricsInsert),
        };
      }

      if (sql.startsWith("INSERT INTO latest_state")) {
        return {
          bind: vi.fn(() => latestInsert),
        };
      }

      if (sql.startsWith("UPDATE devices SET online=1")) {
        return {
          bind: vi.fn(() => deviceUpdate),
        };
      }

      if (sql.startsWith("INSERT INTO ops_metrics")) {
        return {
          bind: vi.fn(() => ({
            run: opsRun,
          })),
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const batch = vi.fn().mockResolvedValue(undefined);

    const env: Env = {
      ...baseEnv(),
      DB: {
        prepare,
        batch,
      } as any,
    };

    const payload = {
      device_id: "dev-123",
      ts: new Date().toISOString(),
      metrics: {
        supplyC: 45.2,
        returnC: 40.1,
        flowLps: 0.2,
        powerKW: 1.2,
      },
    };

    const req = new Request("https://example.com/api/ingest/demo", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        "X-GREENBRO-DEVICE-KEY": "secret",
      },
    });

    const res = await handleIngest(req, env, "demo");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(selectFirst).toHaveBeenCalled();
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0][0]).toEqual([metricsInsert, latestInsert, deviceUpdate]);
    expect(opsRun).toHaveBeenCalled();
  });
});
