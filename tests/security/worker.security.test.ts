import "../helpers/setup";

import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

import { hmacSha256Hex } from "../../src/utils";
import { createWorkerEnv } from "../helpers/worker-env";

const REAL_ALLOWED_ORIGINS = [
  "https://devices.greenbro.io",
  "https://app.greenbro.co.za",
] as const;
const REAL_ALLOWLIST = REAL_ALLOWED_ORIGINS.join(",");

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
      const request = new Request("https://example.com/api/fleet/summary?hours=24&lowDeltaT=2");
      const response = await handleFleetSummary(request, env);
      expect(response.status).toBe(401);
      const payload = await response.json();
      expect(payload.error).toBe("Unauthorized");
    } finally {
      dispose();
    }
  });

  it("rejects ingest requests with an invalid signature", async () => {
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

      const request = new Request("https://example.com/api/ingest/profile-west", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-GREENBRO-DEVICE-KEY": rawSecret,
          "X-GREENBRO-TIMESTAMP": timestamp,
          "X-GREENBRO-SIGNATURE": badSignature,
        },
        body: bodyJson,
      });

      const response = await handleIngest(request, env, "profile-west");
      expect(response.status).toBe(401);
      const payload = await response.json();
      expect(payload.error).toBe("Invalid signature");
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

  it.each(REAL_ALLOWED_ORIGINS)("accepts ingest requests from %s when allowlisted", async (origin) => {
    const { env, dispose } = await createWorkerEnv({
      INGEST_ALLOWED_ORIGINS: REAL_ALLOWLIST,
    });
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
          supplyC: 42.1,
          returnC: 37.9,
          flowLps: 0.24,
          powerKW: 1.12,
        },
        faults: [],
        rssi: -51,
      };
      const bodyJson = JSON.stringify(body);
      const signature = await hmacSha256Hex(secretHash, `${timestamp}.${bodyJson}`);

      const request = new Request("https://example.com/api/ingest/profile-west", {
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

      const response = await handleIngest(request, env, "profile-west");
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe(origin);
      const payload = await response.json();
      expect(payload.ok).toBe(true);
    } finally {
      dispose();
    }
  });
});
