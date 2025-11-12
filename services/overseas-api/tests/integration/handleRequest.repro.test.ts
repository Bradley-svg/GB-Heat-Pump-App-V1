import "../helpers/setup";

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

import type { User } from "../../src/env";
import { createWorkerEnv } from "../helpers/worker-env";

describe("handleRequest repro", () => {
  let handleRequest: typeof import("../../src/router").handleRequest;
  let handleHealthSpy: ReturnType<typeof vi.spyOn> | null = null;
  let requireAccessUserSpy: ReturnType<typeof vi.spyOn> | null = null;
  const adminUser: User = {
    email: "admin@example.com",
    roles: ["admin"],
    clientIds: ["profile-west", "profile-east"],
  };

  beforeAll(async () => {
    const accessModule = await import("../../src/lib/access");
    requireAccessUserSpy = vi.spyOn(accessModule, "requireAccessUser").mockResolvedValue(adminUser);
    const routerModule = await import("../../src/router");
    handleRequest = routerModule.handleRequest;
    handleHealthSpy = vi.spyOn(await import("../../src/routes/health"), "handleHealth");
  });

  afterAll(() => {
    requireAccessUserSpy?.mockRestore();
    handleHealthSpy?.mockRestore();
  });

  it("responds for health", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const res = await handleRequest(new Request("https://example.com/health"), env);
      expect(res.status).toBe(200);
      expect(handleHealthSpy).toHaveBeenCalled();
    } finally {
      dispose();
    }
  });
});
