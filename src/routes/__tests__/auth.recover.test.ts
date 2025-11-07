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

  it("preserves an existing reset token if the webhook fails", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("failure", { status: 500 }),
    );
    globalThis.fetch = fetchMock;

    const { env, dispose } = await createWorkerEnv({
      PASSWORD_RESET_WEBHOOK_URL: "https://hooks.test/password-reset",
    });
    try {
      const user = await env.DB.prepare(`SELECT id FROM users WHERE email = ?1`)
        .bind("demo@example.com")
        .first<{ id: string }>();
      if (!user?.id) {
        throw new Error("Seeded user missing");
      }
      await env.DB
        .prepare(
          `INSERT INTO password_resets (token_hash, user_id, created_at, expires_at, used_at)
           VALUES (?1, ?2, ?3, ?4, NULL)`,
        )
        .bind(
          "legacy-token-hash",
          user.id,
          "2025-11-01T00:00:00.000Z",
          "2025-11-01T01:00:00.000Z",
        )
        .run();

      const req = new Request("https://app.test/api/auth/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "demo@example.com" }),
      });
      const res = await handleRecover(req, env);
      expect(res.status).toBe(502);

      const row = await env.DB.prepare(
        `SELECT token_hash
           FROM password_resets pr
           JOIN users u ON u.id = pr.user_id
          WHERE u.email = ?1`,
      )
        .bind("demo@example.com")
        .first<{ token_hash: string }>();
      expect(row?.token_hash).toBe("legacy-token-hash");
    } finally {
      dispose();
    }
  });
});
