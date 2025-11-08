import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { issueTelemetryToken, authenticateTelemetryRequest } from "../telemetry-token";
import { createWorkerEnv } from "../../../../tests/helpers/worker-env";
import * as loggingModule from "../../../utils/logging";
import type { Logger } from "../../../utils/logging";

describe("telemetry tokens", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("issues a token that authenticates telemetry requests", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const grant = await issueTelemetryToken(env, {
        email: "client@example.com",
        roles: ["client"],
        clientIds: ["profile-123"],
      });
      const req = new Request("https://app.test/api/observability/client-events", {
        headers: { Authorization: `Bearer ${grant.token}` },
      });
      const user = await authenticateTelemetryRequest(req, env);
      expect(user).toEqual({
        email: "client@example.com",
        roles: ["client"],
        clientIds: ["profile-123"],
      });
    } finally {
      dispose();
    }
  });

  it("logs and rejects invalid telemetry tokens", async () => {
    const loggerStub = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      with: vi.fn(),
    };
    loggerStub.with.mockReturnValue(loggerStub);
    const loggerSpy = vi.spyOn(loggingModule, "loggerForRequest").mockReturnValue(
      loggerStub as unknown as Logger,
    );
    const { env, dispose } = await createWorkerEnv();
    try {
      const req = new Request("https://app.test/api/observability/client-events", {
        headers: { Authorization: "Bearer invalid-token" },
      });
      const user = await authenticateTelemetryRequest(req, env);
      expect(user).toBeNull();
      expect(loggerSpy).toHaveBeenCalled();
    } finally {
      dispose();
    }
  });
});
