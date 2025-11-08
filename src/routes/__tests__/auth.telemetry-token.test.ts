import { describe, expect, it } from "vitest";

import { handleTelemetryToken } from "../auth";
import { createWorkerEnv } from "../../../tests/helpers/worker-env";
import { seedTestUser } from "../../../tests/helpers/user";
import { createSession } from "../../lib/auth/sessions";

describe("handleTelemetryToken", () => {
  it("returns 401 when no session or Access context is provided", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const res = await handleTelemetryToken(
        new Request("https://app.test/api/auth/telemetry-token", { method: "POST" }),
        env,
      );
      expect(res.status).toBe(401);
    } finally {
      dispose();
    }
  });

  it("returns a telemetry grant when a valid session cookie is present", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const { userId } = await seedTestUser(env, { roles: ["client"] });
      const { cookie } = await createSession(env, userId);
      const req = new Request("https://app.test/api/auth/telemetry-token", {
        method: "POST",
        headers: { cookie },
      });
      const res = await handleTelemetryToken(req, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { telemetry?: { token?: string } };
      expect(body.telemetry?.token).toBeDefined();
    } finally {
      dispose();
    }
  });
});
