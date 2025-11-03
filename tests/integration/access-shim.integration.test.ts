import "../helpers/setup";

import { describe, expect, it } from "vitest";

import { handleMe } from "../../src/routes/me";
import { createWorkerEnv } from "../helpers/worker-env";

describe("Access dev shim", () => {
  it("returns 401 when shim is disabled and no Access headers are present", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const response = await handleMe(new Request("https://example.com/api/me"), env);
      expect(response.status).toBe(401);
    } finally {
      dispose();
    }
  });

  it("returns the mock user when DEV_ALLOW_USER is configured", async () => {
    const { env, dispose } = await createWorkerEnv({
      APP_BASE_URL: "http://127.0.0.1:8787/app",
      DEV_ALLOW_USER: '{"email":"shim@example.com","roles":["admin"],"clientIds":["profile-west"]}',
      ALLOW_DEV_ACCESS_SHIM: "true",
    });
    try {
      const response = await handleMe(new Request("https://example.com/api/me"), env);
      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        email: string;
        roles: string[];
        clientIds: string[];
      };
      expect(payload.email).toBe("shim@example.com");
      expect(payload.roles).toEqual(["admin"]);
      expect(payload.clientIds).toEqual(["profile-west"]);
    } finally {
      dispose();
    }
  });

  it("still rejects invalid JWTs even when the shim is enabled", async () => {
    const { env, dispose } = await createWorkerEnv({
      APP_BASE_URL: "http://127.0.0.1:8787/app",
      DEV_ALLOW_USER: '{"email":"shim@example.com","roles":["admin"]}',
      ALLOW_DEV_ACCESS_SHIM: "true",
    });
    try {
      const response = await handleMe(
        new Request("https://example.com/api/me", {
          headers: {
            "Cf-Access-Jwt-Assertion": "bogus.jwt.payload",
          },
        }),
        env,
      );
      expect(response.status).toBe(401);
    } finally {
      dispose();
    }
  });
});
