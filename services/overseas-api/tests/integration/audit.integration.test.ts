import "../helpers/setup";

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";

import workerApp from "../../src/app";
import type { User } from "../../src/env";
import { createWorkerEnv } from "../helpers/worker-env";

const BASE_URL = "https://example.com";

function makeRequest(path: string, init?: RequestInit) {
  return new Request(`${BASE_URL}${path}`, init);
}

describe.sequential("Audit endpoints", () => {
  const adminUser: User = {
    email: "admin.audit@example.com",
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

  it("returns audit entries for admin users", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const response = await workerApp.fetch(makeRequest("/api/audit/logs"), env);
      expect(response.status).toBe(200);
      const body = (await response.json()) as { entries: unknown[] };
      expect(Array.isArray(body.entries)).toBe(true);
      expect(body.entries.length).toBeGreaterThan(0);
    } finally {
      dispose();
    }
  });

  it("creates audit entry when actor identity matches", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const payload = {
        audit_id: "test-audit-id",
        actor_id: adminUser.email,
        actor_email: adminUser.email,
        actor_name: "Admin User",
        action: "test-action",
        entity_type: "device",
        entity_id: "dev-1001",
        metadata: { reason: "integration-test" },
        created_at: new Date().toISOString(),
      };
      const response = await workerApp.fetch(
        makeRequest("/api/audit/logs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }),
        env,
      );
      expect(response.status).toBe(201);
      const row = await env.DB.prepare(
        "SELECT action FROM audit_trail WHERE audit_id = ?1 LIMIT 1",
      )
        .bind(payload.audit_id)
        .first<{ action: string | null }>();
      expect(row?.action).toBe("test-action");
    } finally {
      dispose();
    }
  });

  it("rejects audit creation when actor mismatch occurs", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const response = await workerApp.fetch(
        makeRequest("/api/audit/logs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            audit_id: "bad-audit",
            actor_id: "spoof@example.com",
            actor_email: "spoof@example.com",
            action: "spoof",
            created_at: new Date().toISOString(),
          }),
        }),
        env,
      );
      expect(response.status).toBe(400);
    } finally {
      dispose();
    }
  });
});
