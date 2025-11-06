import "../helpers/setup";

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";

import workerApp from "../../src/app";
import type { User } from "../../src/env";
import { createWorkerEnv } from "../helpers/worker-env";

const BASE_URL = "https://example.com";

function makeRequest(path: string, init?: RequestInit) {
  return new Request(`${BASE_URL}${path}`, init);
}

describe.sequential("Telemetry compare mode", () => {
  const adminUser: User = {
    email: "admin.telemetry@example.com",
    roles: ["admin"],
    clientIds: ["profile-west", "profile-east"],
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

  it("returns latest telemetry batch while compare mode is enabled", async () => {
    const { env, dispose } = await createWorkerEnv({
      TELEMETRY_REFACTOR_MODE: "compare",
    });
    try {
      const response = await workerApp.fetch(
        makeRequest("/api/telemetry/latest-batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            devices: ["dev-1001"],
            include: { faults: true, metrics: true },
          }),
        }),
        env,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        items: Array<Record<string, unknown>>;
        missing: string[];
      };
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThan(0);
      expect(body.missing).toEqual([]);
    } finally {
      dispose();
    }
  });

  it("serves telemetry series with compare mode flag", async () => {
    const { env, dispose } = await createWorkerEnv({
      TELEMETRY_REFACTOR_MODE: "compare",
    });
    try {
      const response = await workerApp.fetch(
        makeRequest("/api/telemetry/series?scope=device&device=dev-1001&metric=deltaT"),
        env,
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        series: Array<Record<string, unknown>>;
      };
      expect(Array.isArray(body.series)).toBe(true);
    } finally {
      dispose();
    }
  });
});
