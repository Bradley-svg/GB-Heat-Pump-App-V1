import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleRecover } from "../auth";
import { createWorkerEnv } from "../../../tests/helpers/worker-env";

describe("handleRecover notifications", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns 503 when no password reset notifier is configured", async () => {
    const { env, dispose } = await createWorkerEnv({
      PASSWORD_RESET_WEBHOOK_URL: undefined,
    });
    try {
      const req = new Request("https://app.test/api/auth/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "demo@example.com" }),
      });
      const res = await handleRecover(req, env);
      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({
        error: "Password recovery is temporarily unavailable",
      });
    } finally {
      dispose();
    }
  });

  it("sends a webhook notification and stores the hashed token when configured", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    globalThis.fetch = fetchMock;

    const { env, dispose } = await createWorkerEnv({
      PASSWORD_RESET_WEBHOOK_URL: "https://hooks.test/password-reset",
    });
    try {
      const req = new Request("https://app.test/api/auth/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "demo@example.com" }),
      });
      const res = await handleRecover(req, env);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const call = fetchMock.mock.calls[0];
      expect(call?.[0]).toBe("https://hooks.test/password-reset");
      const body = call?.[1]?.body;
      expect(typeof body).toBe("string");
      const parsed = JSON.parse(body as string);
      expect(parsed.email).toBe("demo@example.com");
      expect(parsed.resetUrl).toContain("token=");

      const row = await env.DB.prepare(
        `SELECT pr.token_hash AS token_hash
           FROM password_resets pr
           JOIN users u ON u.id = pr.user_id
          WHERE u.email = ?1`,
      )
        .bind("demo@example.com")
        .first<{ token_hash: string }>();
      expect(row?.token_hash).toBeTruthy();
    } finally {
      dispose();
    }
  });

  it("fails with 502 when the webhook rejects the notification", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("failure", { status: 500 }),
    );
    globalThis.fetch = fetchMock;

    const { env, dispose } = await createWorkerEnv({
      PASSWORD_RESET_WEBHOOK_URL: "https://hooks.test/password-reset",
    });
    try {
      const req = new Request("https://app.test/api/auth/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "demo@example.com" }),
      });
      const res = await handleRecover(req, env);
      expect(res.status).toBe(502);
      expect(await res.json()).toMatchObject({
        error: "Unable to deliver reset instructions",
      });
      const row = await env.DB.prepare(
        `SELECT COUNT(*) AS cnt
           FROM password_resets pr
           JOIN users u ON u.id = pr.user_id
          WHERE u.email = ?1`,
      )
        .bind("demo@example.com")
        .first<{ cnt: number }>();
      expect(row?.cnt ?? 0).toBe(0);
    } finally {
      dispose();
    }
  });
});

