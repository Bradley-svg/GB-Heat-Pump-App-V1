import "../helpers/setup";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createWorkerEnv } from "../helpers/worker-env";

describe.sequential("Worker smoke checks", () => {
  let handleHealth: typeof import("../../src/routes/health").handleHealth;
  let handleMetrics: typeof import("../../src/routes/metrics").handleMetrics;
  let handleListAlertRecords: typeof import("../../src/routes/alerts").handleListAlertRecords;
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
    ({ handleHealth } = await import("../../src/routes/health"));
    ({ handleMetrics } = await import("../../src/routes/metrics"));
    ({ handleListAlertRecords } = await import("../../src/routes/alerts"));
  });

  afterAll(() => {
    requireAccessUserSpy?.mockRestore();
  });

  it("responds to /health", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const response = await handleHealth();
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.ok).toBe(true);
    } finally {
      dispose();
    }
  });

  it("exposes metrics in JSON format", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const response = await handleMetrics(new Request("https://example.com/metrics?format=json"), env);
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.devices).toBeDefined();
      expect(payload.ops).toBeDefined();
      expect(payload.generated_at).toBeTypeOf("string");
    } finally {
      dispose();
    }
  });

  it("lists seeded alerts for admins", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const response = await handleListAlertRecords(
        new Request("https://example.com/api/alerts?limit=5"),
        env,
      );
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(Array.isArray(payload.items)).toBe(true);
      expect(payload.items.length).toBeGreaterThan(0);
    } finally {
      dispose();
    }
  });
});
