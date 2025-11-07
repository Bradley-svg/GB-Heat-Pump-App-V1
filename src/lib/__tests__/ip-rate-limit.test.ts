import { describe, expect, it } from "vitest";

import { checkIpRateLimit } from "../ip-rate-limit";
import { createWorkerEnv } from "../../../tests/helpers/worker-env";

function buildRequest(ip: string) {
  return new Request("https://app.test/api/auth/login", {
    headers: {
      "cf-connecting-ip": ip,
    },
  });
}

describe("ip-rate-limit config resolution", () => {
  it("falls back to defaults when auth env vars are unset", async () => {
    const { env, dispose } = await createWorkerEnv({
      AUTH_IP_LIMIT_PER_MIN: undefined,
      AUTH_IP_BLOCK_SECONDS: undefined,
    });
    delete (env as any).AUTH_IP_LIMIT_PER_MIN;
    delete (env as any).AUTH_IP_BLOCK_SECONDS;
    env.INGEST_IP_LIMIT_PER_MIN = "0";
    env.INGEST_IP_BLOCK_SECONDS = "60";

    try {
      const options = {
        limitEnvKey: "AUTH_IP_LIMIT_PER_MIN" as const,
        blockEnvKey: "AUTH_IP_BLOCK_SECONDS" as const,
        defaultLimit: 2,
        defaultBlockSeconds: 120,
      };
      const route = "/api/auth/login";
      const req = buildRequest("203.0.113.20");
      const first = await checkIpRateLimit(req, env, route, options);
      expect(first?.limited).toBe(false);
      const second = await checkIpRateLimit(req, env, route, options);
      expect(second?.limited).toBe(false);
      const third = await checkIpRateLimit(req, env, route, options);
      expect(third?.limited).toBe(true);
    } finally {
      dispose();
    }
  });

  it("prefers auth-specific env values over ingest settings", async () => {
    const { env, dispose } = await createWorkerEnv({
      AUTH_IP_LIMIT_PER_MIN: "3",
      AUTH_IP_BLOCK_SECONDS: "60",
    });
    env.INGEST_IP_LIMIT_PER_MIN = "1";

    try {
      const options = {
        limitEnvKey: "AUTH_IP_LIMIT_PER_MIN" as const,
        blockEnvKey: "AUTH_IP_BLOCK_SECONDS" as const,
      };
      const route = "/api/auth/login";
      const req = buildRequest("203.0.113.44");
      const first = await checkIpRateLimit(req, env, route, options);
      expect(first?.limited).toBe(false);
      const second = await checkIpRateLimit(req, env, route, options);
      expect(second?.limited).toBe(false);
    } finally {
      dispose();
    }
  });
});
