import "../helpers/setup";

import { createHash } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../../src/env";
import { hmacSha256Hex } from "../../src/utils";
import { createWorkerEnv } from "../helpers/worker-env";
import * as loggingModule from "../../src/utils/logging";

const REAL_ALLOWED_ORIGINS = [
  "https://devices.greenbro.io",
  "https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev",
] as const;
const REAL_ALLOWLIST = REAL_ALLOWED_ORIGINS.join(",");
const REAL_RATE_LIMIT_PER_MIN = 120;
const REAL_SIGNATURE_TOLERANCE_SECS = 300;
const TEST_DEVICE_ID = "dev-1001";
const TEST_PROFILE_ID = "profile-west";
const HEX64_PATTERN = /^[0-9a-f]{64}$/;

async function configureDeviceSecret(
  env: Env,
  rawSecret: string,
  deviceId: string = TEST_DEVICE_ID,
) {
  const secretHash = createHash("sha256").update(rawSecret).digest("hex");
  await env.DB.prepare(
    `UPDATE devices SET device_key_hash=?1 WHERE device_id=?2`,
  ).bind(secretHash, deviceId).run();
  return { rawSecret, secretHash };
}

function buildTelemetryBody(timestamp: string) {
  return {
    device_id: TEST_DEVICE_ID,
    ts: timestamp,
    metrics: {
      supplyC: 42.1,
      returnC: 37.9,
      flowLps: 0.24,
      powerKW: 1.12,
    },
    faults: [],
    rssi: -51,
  };
}

type LoggerMock = {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  with: ReturnType<typeof vi.fn>;
};

function createLoggerStub(): LoggerMock {
  const stub: LoggerMock = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    with: vi.fn(),
  };
  stub.with.mockReturnValue(stub);
  return stub;
}

const originalLoggerForRequest = loggingModule.loggerForRequest;
const loggerForRequestMock = vi.spyOn(loggingModule, "loggerForRequest");

beforeEach(() => {
  loggerForRequestMock.mockImplementation((req, extra) => originalLoggerForRequest(req, extra));
});

afterEach(() => {
  loggerForRequestMock.mockClear();
});

afterAll(() => {
  loggerForRequestMock.mockRestore();
});

describe.sequential("Worker security safeguards", () => {
  let handleFleetSummary: typeof import("../../src/routes/fleet").handleFleetSummary;
  let handleIngest: typeof import("../../src/routes/ingest").handleIngest;

  beforeAll(async () => {
    ({ handleFleetSummary } = await import("../../src/routes/fleet"));
    ({ handleIngest } = await import("../../src/routes/ingest"));
  });

  it("blocks protected APIs without a valid access token", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const logger = createLoggerStub();
      loggerForRequestMock.mockReturnValueOnce(logger as unknown as loggingModule.Logger);

      const request = new Request("https://example.com/api/fleet/summary?hours=24&lowDeltaT=2", {
        headers: {
          "Cf-Access-Jwt-Assertion": "not-a-valid-token",
          "Cf-Access-Authenticated-User-Email": "intruder@example.com",
          "cf-ray": "cf-ray-id",
        },
      });
      const response = await handleFleetSummary(request, env);
      expect(response.status).toBe(401);
      const payload = await response.json();
      expect(payload.error).toBe("Unauthorized");

      expect(logger.warn).toHaveBeenCalledTimes(1);
      const [eventName, fields] = logger.warn.mock.calls[0] as [string, any];
      expect(eventName).toBe("access.jwt_verify_failed");
      expect(fields).toMatchObject({
        audience: env.ACCESS_AUD,
        cf_ray: "cf-ray-id",
        metric_key: "security.jwt_verify_failed",
        count: 1,
      });
      expect(typeof fields.reason).toBe("string");
      expect(fields.reason.length).toBeGreaterThan(0);
      expect(fields.sanitized_email).toBe("i***r@example.com");
    } finally {
      dispose();
    }
  });

  it("rejects ingest requests with an invalid signature", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const rawSecret = "dev-1001-secret";
      const { secretHash } = await configureDeviceSecret(env, rawSecret);

      const timestamp = new Date().toISOString();
      const body = {
        device_id: TEST_DEVICE_ID,
        ts: timestamp,
        metrics: {
          supplyC: 40,
          returnC: 34,
          flowLps: 0.25,
          powerKW: 1.05,
        },
        faults: [],
        rssi: -55,
      };
      const bodyJson = JSON.stringify(body);
      const badSignature = await hmacSha256Hex(secretHash, `${timestamp}.${bodyJson}`) + "00";

      const request = new Request(`https://example.com/api/ingest/${TEST_PROFILE_ID}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-GREENBRO-DEVICE-KEY": rawSecret,
          "X-GREENBRO-TIMESTAMP": timestamp,
          "X-GREENBRO-SIGNATURE": badSignature,
        },
        body: bodyJson,
      });

      const response = await handleIngest(request, env, TEST_PROFILE_ID);
      expect(response.status).toBe(401);
      const payload = await response.json();
      expect(payload.error).toBe("Invalid signature");

      const metricRow = await env.DB
        .prepare(`SELECT status_code, device_id FROM ops_metrics WHERE route = ?1 ORDER BY ts DESC LIMIT 1`)
        .bind("/api/ingest")
        .first<{ status_code: number | string | null; device_id?: string | null }>();
      expect(metricRow).toBeTruthy();
      expect(Number(metricRow!.status_code ?? NaN)).toBe(401);
      expect(metricRow!.device_id ?? null).toBe(TEST_DEVICE_ID);
    } finally {
      dispose();
    }
  });

  it("seeds devices with hashed keys", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const row = await env.DB
        .prepare(`SELECT device_key_hash FROM devices WHERE device_id=?1`)
        .bind(TEST_DEVICE_ID)
        .first<{ device_key_hash?: string | null }>();
      expect(row?.device_key_hash ?? "").toMatch(HEX64_PATTERN);
    } finally {
      dispose();
    }
  });

  it("prevents storing unhashed device secrets", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      await expect(
        env.DB
          .prepare(`UPDATE devices SET device_key_hash=?1 WHERE device_id=?2`)
          .bind("not-a-real-hash", TEST_DEVICE_ID)
          .run(),
      ).rejects.toThrow(/D1_ERROR/);
      const row = await env.DB
        .prepare(`SELECT device_key_hash FROM devices WHERE device_id=?1`)
        .bind(TEST_DEVICE_ID)
        .first<{ device_key_hash?: string | null }>();
      expect(row?.device_key_hash ?? "").toMatch(HEX64_PATTERN);
    } finally {
      dispose();
    }
  });

  it("matches the documented ingest guardrail defaults", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      expect(Number(env.INGEST_RATE_LIMIT_PER_MIN)).toBe(REAL_RATE_LIMIT_PER_MIN);
      expect(Number(env.INGEST_SIGNATURE_TOLERANCE_SECS)).toBe(REAL_SIGNATURE_TOLERANCE_SECS);
    } finally {
      dispose();
    }
  });

  it("enforces ingest origin allowlists", async () => {
    const { env, dispose } = await createWorkerEnv({
      INGEST_ALLOWED_ORIGINS: REAL_ALLOWLIST,
    });
    try {
      const request = new Request("https://example.com/api/ingest/profile-west", {
        method: "POST",
        headers: {
          Origin: "https://evil.test",
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const response = await handleIngest(request, env, "profile-west");
      expect(response.status).toBe(403);
      const payload = await response.json();
      expect(payload.error).toBe("Origin not allowed");
    } finally {
      dispose();
    }
  });

  it("rejects ingest requests with signatures outside configured tolerance", async () => {
    const { env, dispose } = await createWorkerEnv({
      INGEST_ALLOWED_ORIGINS: REAL_ALLOWLIST,
      INGEST_SIGNATURE_TOLERANCE_SECS: "60",
    });
    try {
      const { rawSecret, secretHash } = await configureDeviceSecret(env, "dev-1001-secret");
      const origin = REAL_ALLOWED_ORIGINS[0];
      const staleTimestamp = new Date(Date.now() - 120_000).toISOString();
      const body = buildTelemetryBody(staleTimestamp);
      const bodyJson = JSON.stringify(body);
      const signature = await hmacSha256Hex(secretHash, `${staleTimestamp}.${bodyJson}`);

      const request = new Request(`https://example.com/api/ingest/${TEST_PROFILE_ID}`, {
        method: "POST",
        headers: {
          Origin: origin,
          "content-type": "application/json",
          "X-GREENBRO-DEVICE-KEY": rawSecret,
          "X-GREENBRO-TIMESTAMP": staleTimestamp,
          "X-GREENBRO-SIGNATURE": signature,
        },
        body: bodyJson,
      });

      const response = await handleIngest(request, env, TEST_PROFILE_ID);
      expect(response.status).toBe(401);
      const payload = await response.json();
      expect(payload.error).toBe("Signature timestamp outside tolerance");
    } finally {
      dispose();
    }
  });

  it("rate limits ingest requests when the per-minute quota is exceeded", async () => {
    const { env, dispose } = await createWorkerEnv({
      INGEST_ALLOWED_ORIGINS: REAL_ALLOWLIST,
      INGEST_RATE_LIMIT_PER_MIN: "1",
    });
    try {
      const { rawSecret, secretHash } = await configureDeviceSecret(env, "dev-1001-secret");
      const origin = REAL_ALLOWED_ORIGINS[0];

      const timestampA = new Date().toISOString();
      const bodyA = buildTelemetryBody(timestampA);
      const rawA = JSON.stringify(bodyA);
      const signatureA = await hmacSha256Hex(secretHash, `${timestampA}.${rawA}`);

      const firstRequest = new Request(`https://example.com/api/ingest/${TEST_PROFILE_ID}`, {
        method: "POST",
        headers: {
          Origin: origin,
          "content-type": "application/json",
          "X-GREENBRO-DEVICE-KEY": rawSecret,
          "X-GREENBRO-TIMESTAMP": timestampA,
          "X-GREENBRO-SIGNATURE": signatureA,
        },
        body: rawA,
      });

      const firstResponse = await handleIngest(firstRequest, env, TEST_PROFILE_ID);
      expect(firstResponse.status).toBe(200);

      const timestampB = new Date(Date.now() + 1000).toISOString();
      const bodyB = buildTelemetryBody(timestampB);
      const rawB = JSON.stringify(bodyB);
      const signatureB = await hmacSha256Hex(secretHash, `${timestampB}.${rawB}`);

      const secondRequest = new Request(`https://example.com/api/ingest/${TEST_PROFILE_ID}`, {
        method: "POST",
        headers: {
          Origin: origin,
          "content-type": "application/json",
          "X-GREENBRO-DEVICE-KEY": rawSecret,
          "X-GREENBRO-TIMESTAMP": timestampB,
          "X-GREENBRO-SIGNATURE": signatureB,
        },
        body: rawB,
      });

      const secondResponse = await handleIngest(secondRequest, env, TEST_PROFILE_ID);
      expect(secondResponse.status).toBe(429);
      const payload = await secondResponse.json();
      expect(payload.error).toBe("Rate limit exceeded");
    } finally {
      dispose();
    }
  });

  it.each(REAL_ALLOWED_ORIGINS)("accepts ingest requests from %s when allowlisted", async (origin) => {
    const { env, dispose } = await createWorkerEnv({
      INGEST_ALLOWED_ORIGINS: REAL_ALLOWLIST,
    });
    try {
      const rawSecret = "dev-1001-secret";
      const { secretHash } = await configureDeviceSecret(env, rawSecret);

      const timestamp = new Date().toISOString();
      const body = buildTelemetryBody(timestamp);
      const bodyJson = JSON.stringify(body);
      const signature = await hmacSha256Hex(secretHash, `${timestamp}.${bodyJson}`);

      const request = new Request(`https://example.com/api/ingest/${TEST_PROFILE_ID}`, {
        method: "POST",
        headers: {
          Origin: origin,
          "content-type": "application/json",
          "X-GREENBRO-DEVICE-KEY": rawSecret,
          "X-GREENBRO-TIMESTAMP": timestamp,
          "X-GREENBRO-SIGNATURE": signature,
        },
        body: bodyJson,
      });

      const response = await handleIngest(request, env, TEST_PROFILE_ID);
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe(origin);
      const payload = await response.json();
      expect(payload.ok).toBe(true);
    } finally {
      dispose();
    }
  });
});
