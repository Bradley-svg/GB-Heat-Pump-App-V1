import "../helpers/setup";

import { describe, expect, it, vi } from "vitest";

import { handleClientEventReport } from "../../src/routes/observability";
import { createWorkerEnv } from "../helpers/worker-env";
import type { User } from "../../src/env";
import * as accessModule from "../../src/lib/access";

describe.sequential("Client event persistence", () => {
  it("stores events via the public route", async () => {
    const testUser: User = {
      email: "integration@example.com",
      roles: ["admin"],
      clientIds: ["profile-west"],
    };
    const requireAccessUserSpy = vi
      .spyOn(accessModule, "requireAccessUser")
      .mockResolvedValue(testUser);
    const { env, dispose } = await createWorkerEnv();
    try {
      const payload = {
        event: "auth.pending_logout.flush_failed",
        properties: { message: "integration client-event" },
      };
      const request = new Request("https://worker.test/api/observability/client-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await handleClientEventReport(request, env);
      expect(response.status).toBe(202);

      const row = await env.DB
        .prepare(
          "SELECT event, source, user_email, dimension, properties FROM client_events ORDER BY created_at DESC LIMIT 1",
        )
        .first<{ event: string; source: string | null; user_email: string | null; dimension: string | null; properties: string | null }>();

      expect(row?.event).toBe(payload.event);
      expect(row?.dimension).toBe("flush_failed");
      expect(row?.user_email).toMatch(/^sha256:/);
      const properties = row?.properties ? JSON.parse(row.properties) : null;
      expect(properties?.message).toBe("integration client-event");
    } finally {
      requireAccessUserSpy.mockRestore();
      dispose();
    }
  });
});
