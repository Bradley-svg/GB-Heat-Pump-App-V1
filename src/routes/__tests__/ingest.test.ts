import { afterEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../../env";
import { handleIngest } from "../ingest";
import * as deviceModule from "../../lib/device";
import { hmacSha256Hex } from "../../utils";

const DEVICE_KEY_HASH = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const DEVICE_KEY_HEADER = "X-GREENBRO-DEVICE-KEY";
const SIGNATURE_HEADER = "X-GREENBRO-SIGNATURE";
const TIMESTAMP_HEADER = "X-GREENBRO-TIMESTAMP";

const verifyDeviceKeyMock = vi.spyOn(deviceModule, "verifyDeviceKey");
const claimDeviceIfUnownedMock = vi.spyOn(deviceModule, "claimDeviceIfUnowned");

function baseEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as any,
    ACCESS_JWKS_URL: "",
    ACCESS_AUD: "",
    APP_BASE_URL: "",
    RETURN_DEFAULT: "",
    HEARTBEAT_INTERVAL_SECS: "30",
    OFFLINE_MULTIPLIER: "6",
    CURSOR_SECRET: "",
    ...overrides,
  };
}

async function buildSignedRequest(
  profile: string,
  payload: any,
  opts: { origin?: string; timestamp?: string; signature?: string } = {},
) {
  const bodyPayload = { ...payload };
  const timestamp =
    opts.timestamp ??
    (typeof bodyPayload.ts === "string" ? bodyPayload.ts : new Date().toISOString());
  if (!bodyPayload.ts) {
    bodyPayload.ts = timestamp;
  }

  const bodyJson = JSON.stringify(bodyPayload);
  const signature =
    opts.signature ??
    (await hmacSha256Hex(DEVICE_KEY_HASH, `${timestamp}.${bodyJson}`));

  const headers: Record<string, string> = {
    "content-type": "application/json",
    [DEVICE_KEY_HEADER]: "secret",
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: signature,
  };

  if (opts.origin) {
    headers.Origin = opts.origin;
  }

  return new Request(`https://example.com/api/ingest/${profile}`, {
    method: "POST",
    body: bodyJson,
    headers,
  });
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
    const payload = (await res.json()) as any;
    expect(payload.error).toBe("Invalid JSON");
  });

  it("returns 401 when device key verification fails", async () => {
    verifyDeviceKeyMock.mockResolvedValue({ ok: false, reason: "mismatch" });
    const env = baseEnv();
    const payload = {
      device_id: "dev-123",
      metrics: { supplyC: 10 },
    };
    const req = await buildSignedRequest("demo", payload);

    const res = await handleIngest(req, env, "demo");
    expect(verifyDeviceKeyMock).toHaveBeenCalled();
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error).toBe("Unauthorized");
  });

  it("rejects requests with an invalid signature", async () => {
    verifyDeviceKeyMock.mockResolvedValue({ ok: true, deviceKeyHash: DEVICE_KEY_HASH });
    const env = baseEnv();
    const payload = {
      device_id: "dev-123",
      metrics: { supplyC: 10 },
    };
    const req = await buildSignedRequest("demo", payload, { signature: "bad-signature" });

    const res = await handleIngest(req, env, "demo");
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error).toBe("Invalid signature");
  });

  it("returns 200 for a valid payload", async () => {
    verifyDeviceKeyMock.mockResolvedValue({ ok: true, deviceKeyHash: DEVICE_KEY_HASH });
    claimDeviceIfUnownedMock.mockResolvedValue({ ok: true });

    const selectFirst = vi.fn().mockResolvedValue({ profile_id: "demo" });
    const countFirst = vi.fn().mockResolvedValue({ cnt: 0 });

    const metricsInsert = { kind: "telemetry" };
    const latestInsert = { kind: "latest_state" };
    const deviceUpdate = { kind: "device_update" };
    const opsRun = vi.fn().mockResolvedValue(undefined);

    const prepare = vi.fn((sql: string) => {
      if (sql.startsWith("SELECT COUNT(*) AS cnt FROM ops_metrics")) {
        return {
          bind: vi.fn(() => ({
            first: countFirst,
          })),
        };
      }

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
      metrics: {
        supplyC: 45.2,
        returnC: 40.1,
        flowLps: 0.2,
        powerKW: 1.2,
      },
    };

    const req = await buildSignedRequest("demo", payload);

    const res = await handleIngest(req, env, "demo");

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.ok).toBe(true);

    expect(selectFirst).toHaveBeenCalled();
    expect(countFirst).toHaveBeenCalled();
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0][0]).toEqual([metricsInsert, latestInsert, deviceUpdate]);
    expect(opsRun).toHaveBeenCalled();
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("vary")).toBe("origin");
  });

  it("rejects disallowed origins before touching device auth", async () => {
    const env = baseEnv({ INGEST_ALLOWED_ORIGINS: "https://allowed.local" });
    const payload = {
      device_id: "blocked-device",
      metrics: { supplyC: 12 },
    };

    const req = await buildSignedRequest("demo", payload, { origin: "https://evil.local" });
    const res = await handleIngest(req, env, "demo");

    expect(res.status).toBe(403);
    expect(res.headers.has("access-control-allow-origin")).toBe(false);
    expect(verifyDeviceKeyMock).not.toHaveBeenCalled();
  });

  it("throttles requests when rate limit exceeded", async () => {
    verifyDeviceKeyMock.mockResolvedValue({ ok: true, deviceKeyHash: DEVICE_KEY_HASH });
    const selectFirst = vi.fn().mockResolvedValue({ profile_id: "demo" });
    const countFirst = vi.fn().mockResolvedValue({ cnt: 5 });
    const opsRun = vi.fn().mockResolvedValue(undefined);

    const prepare = vi.fn((sql: string) => {
      if (sql.startsWith("SELECT COUNT(*) AS cnt FROM ops_metrics")) {
        return {
          bind: vi.fn(() => ({
            first: countFirst,
          })),
        };
      }

      if (sql.includes("SELECT profile_id FROM devices")) {
        return {
          bind: vi.fn(() => ({
            first: selectFirst,
          })),
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

    const env: Env = {
      ...baseEnv({ INGEST_RATE_LIMIT_PER_MIN: "1" }),
      DB: {
        prepare,
        batch: vi.fn(),
      } as any,
    };

    const payload = {
      device_id: "dev-123",
      metrics: { supplyC: 20 },
    };

    const req = await buildSignedRequest("demo", payload);
    const res = await handleIngest(req, env, "demo");

    expect(res.status).toBe(429);
    const body = (await res.json()) as any;
    expect(body.error).toBe("Rate limit exceeded");
    expect(opsRun).toHaveBeenCalled();
  });
});
