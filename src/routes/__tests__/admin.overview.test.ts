import { describe, expect, it } from "vitest";

import { handleAdminOverview, handleFleetAdminOverview } from "../admin";
import { createWorkerEnv } from "../../../tests/helpers/worker-env";
import { seedTestUser } from "../../../tests/helpers/user";
import { createSession } from "../../lib/auth/sessions";

async function buildRequestWithSession(
  env: Awaited<ReturnType<typeof createWorkerEnv>>["env"],
  roles: string[],
) {
  const { userId } = await seedTestUser(env, { roles });
  const { cookie } = await createSession(env, userId);
  return new Request("https://app.test/api/fleet/admin-overview", {
    method: "GET",
    headers: { cookie },
  });
}

describe("admin overview RBAC", () => {
  it("denies fleet overview to non-admin sessions", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const req = await buildRequestWithSession(env, ["client"]);
      const res = await handleFleetAdminOverview(req, env);
      expect(res.status).toBe(403);
    } finally {
      dispose();
    }
  });

  it("allows fleet and admin overview for admin sessions", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const { userId } = await seedTestUser(env, { roles: ["admin"] });
      const { cookie } = await createSession(env, userId);
      const fleetReq = new Request("https://app.test/api/fleet/admin-overview", {
        method: "GET",
        headers: { cookie },
      });
      const fleetRes = await handleFleetAdminOverview(fleetReq, env);
      expect(fleetRes.status).toBe(200);

      const adminReq = new Request("https://app.test/api/admin/overview", {
        method: "GET",
        headers: { cookie },
      });
      const adminRes = await handleAdminOverview(adminReq, env);
      expect(adminRes.status).toBe(200);
    } finally {
      dispose();
    }
  });
});
