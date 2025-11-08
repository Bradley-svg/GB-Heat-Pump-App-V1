import { afterEach, describe, expect, it, vi } from "vitest";

import { handleTelemetryToken } from "../auth";
import * as accessModule from "../../lib/access";
import { createWorkerEnv } from "../../../tests/helpers/worker-env";

describe("handleTelemetryToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when no user is authenticated", async () => {
    const { env, dispose } = await createWorkerEnv();
    vi.spyOn(accessModule, "requireAccessUser").mockResolvedValueOnce(null);
    try {
      const res = await handleTelemetryToken(
        new Request("https://app.test/api/auth/telemetry-token"),
        env,
      );
      expect(res.status).toBe(401);
    } finally {
      dispose();
    }
  });

  it("returns a fresh telemetry grant when session is valid", async () => {
    const { env, dispose } = await createWorkerEnv();
    vi.spyOn(accessModule, "requireAccessUser").mockResolvedValueOnce({
      email: "mobile@example.com",
      roles: ["client"],
      clientIds: ["profile-west"],
    });
    try {
      const res = await handleTelemetryToken(
        new Request("https://app.test/api/auth/telemetry-token"),
        env,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { telemetry?: { token?: string } };
      expect(body.telemetry?.token).toBeDefined();
    } finally {
      dispose();
    }
  });
});
