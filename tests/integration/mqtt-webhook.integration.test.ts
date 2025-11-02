import "../helpers/setup";

import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from "vitest";

import type { User } from "../../src/env";
import { createWorkerEnv } from "../helpers/worker-env";

describe("MQTT webhook route", () => {
  const adminUser: User = {
    email: "admin@example.com",
    roles: ["admin"],
    clientIds: ["profile-west", "profile-east"],
  };

  let currentUser: User | null = adminUser;
  let handleRequest: typeof import("../../src/router").handleRequest;
  let requireAccessUserSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeAll(async () => {
    ({ handleRequest } = await import("../../src/router"));
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

  it("stores webhook payload when authorized and no queue is configured", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const request = new Request("https://example.com/api/mqtt-webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: "greenbro/profile-east/commands",
          payload: { command: "start" },
          qos: 1,
          retain: false,
          profile_id: "profile-east",
          published_at: new Date().toISOString(),
        }),
      });

      const response = await handleRequest(request, env);
      expect(response.status).toBe(201);
      const body = (await response.json()) as Record<string, unknown>;
      expect(body.ok).toBe(true);
      expect(body.delivery).toBe("store");
      expect(typeof body.message_id).toBe("string");

      const row = await env.DB.prepare(
        `SELECT topic, qos, retain, profile_id, actor_email FROM mqtt_webhook_messages WHERE message_id = ?1`,
      )
        .bind(body.message_id as string)
        .first<{
          topic: string;
          qos: number;
          retain: number;
          profile_id: string | null;
          actor_email: string | null;
        }>();

      expect(row).toBeTruthy();
      expect(row?.topic).toBe("greenbro/profile-east/commands");
      expect(Number(row?.qos)).toBe(1);
      expect(Number(row?.retain)).toBe(0);
      expect(row?.profile_id).toBe("profile-east");
      expect(row?.actor_email).toBe(adminUser.email);
    } finally {
      dispose();
    }
  });

  it("rejects webhook when user is not authenticated", async () => {
    currentUser = null;
    const { env, dispose } = await createWorkerEnv();
    try {
      const response = await handleRequest(
        new Request("https://example.com/api/mqtt-webhook", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ topic: "test/topic", payload: { command: "noop" } }),
        }),
        env,
      );

      expect(response.status).toBe(401);
      const total = await env.DB.prepare(
        `SELECT COUNT(*) AS cnt FROM mqtt_webhook_messages`,
      )
        .first<{ cnt: number | string | null }>();

      const countValue = typeof total?.cnt === "number" ? total.cnt : Number(total?.cnt ?? 0);
      expect(countValue).toBe(0);
    } finally {
      dispose();
    }
  });

  it("returns validation error for malformed payload", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const response = await handleRequest(
        new Request("https://example.com/api/mqtt-webhook", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ topic: "", payload: { command: "noop" } }),
        }),
        env,
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as Record<string, unknown>;
      expect(body.error).toBe("Validation failed");

      const total = await env.DB.prepare(
        `SELECT COUNT(*) AS cnt FROM mqtt_webhook_messages`,
      )
        .first<{ cnt: number | string | null }>();

      const countValue = typeof total?.cnt === "number" ? total.cnt : Number(total?.cnt ?? 0);
      expect(countValue).toBe(0);
    } finally {
      dispose();
    }
  });
});
