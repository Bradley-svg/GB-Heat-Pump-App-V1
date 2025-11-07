import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { handleLogin, handleRecover, handleSignup } from "../auth";
import { createWorkerEnv } from "../../../tests/helpers/worker-env";
import { checkIpRateLimit } from "../../lib/ip-rate-limit";

vi.mock("../../lib/ip-rate-limit", () => ({
  checkIpRateLimit: vi.fn(),
}));

const mockedRateLimit = vi.mocked(checkIpRateLimit);

describe("auth rate limiting", () => {
  beforeEach(() => {
    mockedRateLimit.mockReset();
    mockedRateLimit.mockResolvedValue(null);
  });

  afterEach(() => {
    mockedRateLimit.mockReset();
  });

  it("limits login attempts when the IP bucket is exhausted", async () => {
    mockedRateLimit.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 60,
      remaining: 0,
      limit: 25,
      ip: "203.0.113.10",
    });
    const { env, dispose } = await createWorkerEnv();
    try {
      const req = new Request("https://app.test/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.10",
        },
        body: JSON.stringify({ email: "user@example.com", password: "Secret123!" }),
      });
      const res = await handleLogin(req, env);
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("60");
      expect(await res.json()).toMatchObject({ error: "Too many attempts" });
      expect(mockedRateLimit).toHaveBeenCalledWith(
        expect.any(Request),
        env,
        "/api/auth/login",
        expect.any(Object),
      );
    } finally {
      dispose();
    }
  });

  it("limits recover requests when triggered repeatedly", async () => {
    mockedRateLimit.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 45,
      remaining: 0,
      limit: 20,
      ip: "203.0.113.44",
    });
    const { env, dispose } = await createWorkerEnv();
    try {
      const req = new Request("https://app.test/api/auth/recover", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.44",
        },
        body: JSON.stringify({ email: "user@example.com" }),
      });
      const res = await handleRecover(req, env);
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("45");
      expect(await res.json()).toMatchObject({ error: "Too many attempts" });
      expect(mockedRateLimit).toHaveBeenCalledWith(
        expect.any(Request),
        env,
        "/api/auth/recover",
        expect.any(Object),
      );
    } finally {
      dispose();
    }
  });

  it("limits signup requests per IP", async () => {
    mockedRateLimit.mockResolvedValue({
      limited: true,
      retryAfterSeconds: 30,
      remaining: 0,
      limit: 15,
      ip: "198.51.100.7",
    });
    const { env, dispose } = await createWorkerEnv();
    try {
      const req = new Request("https://app.test/api/auth/signup", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "198.51.100.7",
        },
        body: JSON.stringify({
          email: "new_user@example.com",
          password: "Secret123!",
          firstName: "New",
          lastName: "User",
        }),
      });
      const res = await handleSignup(req, env);
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("30");
      expect(await res.json()).toMatchObject({ error: "Too many attempts" });
      expect(mockedRateLimit).toHaveBeenCalledWith(
        expect.any(Request),
        env,
        "/api/auth/signup",
        expect.any(Object),
      );
    } finally {
      dispose();
    }
  });
});
