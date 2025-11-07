import { describe, it, expect, beforeEach, vi } from "vitest";

import { handleSignup, handleVerifyEmail } from "../auth";
import { createWorkerEnv } from "../../../tests/helpers/worker-env";
import type { EmailVerificationNotificationPayload } from "../../lib/notifications/password-reset";
import * as notificationModule from "../../lib/notifications/password-reset";

vi.mock("../../lib/notifications/password-reset", () => ({
  sendPasswordResetNotification: vi.fn(),
  sendEmailVerificationNotification: vi.fn(),
}));

const mockedSendVerification = vi.mocked(notificationModule.sendEmailVerificationNotification);

describe("signup + email verification", () => {
  beforeEach(() => {
    mockedSendVerification.mockClear();
  });

  it("issues a verification email and never reveals account status", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const payload = {
        email: "new-user@example.com",
        password: "StrongPass123!",
        firstName: "New",
        lastName: "User",
      };
      const req = new Request("https://app.test/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await handleSignup(req, env);
      expect(res.status).toBe(202);
      expect(await res.json()).toEqual({ ok: true });
      expect(res.headers.get("set-cookie")).toBeNull();

      expect(mockedSendVerification).toHaveBeenCalledTimes(1);
      const callPayload = mockedSendVerification.mock.calls[0]?.[1] as EmailVerificationNotificationPayload;
      expect(callPayload.email).toBe(payload.email.toLowerCase());
      expect(callPayload.verifyUrl).toContain("/auth/verify");

      const verificationRow = await env.DB.prepare(
        `SELECT user_id, used_at FROM email_verifications WHERE user_id = (
          SELECT id FROM users WHERE email = ?1
         )`,
      )
        .bind(payload.email.toLowerCase())
        .first<{ user_id: string; used_at: string | null }>();
      expect(verificationRow).not.toBeNull();
      expect(verificationRow?.used_at).toBeNull();
    } finally {
      dispose();
    }
  });

  it("exchanges a valid verification token for a session", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const payload = {
        email: "verify-me@example.com",
        password: "VerifyPass123!",
        firstName: "Verify",
        lastName: "User",
      };
      const signupReq = new Request("https://app.test/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      await handleSignup(signupReq, env);
      const callPayload = mockedSendVerification.mock.calls.at(-1)?.[1] as EmailVerificationNotificationPayload;
      expect(callPayload).toBeDefined();
      const verifyUrl = new URL(callPayload.verifyUrl);
      const token = verifyUrl.searchParams.get("token");
      expect(token).toBeTruthy();

      const tokenValue = token as string;
      const verifyReq = new Request("https://app.test/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: tokenValue }),
      });
      const verifyRes = await handleVerifyEmail(verifyReq, env);
      expect(verifyRes.status).toBe(200);
      const body = await verifyRes.json() as { user?: { email: string } };
      expect(body.user?.email).toBe(payload.email.toLowerCase());
      expect(verifyRes.headers.get("set-cookie")).toContain("gb_session=");

      const userRow = await env.DB.prepare("SELECT verified_at FROM users WHERE email = ?1")
        .bind(payload.email.toLowerCase())
        .first<{ verified_at: string | null }>();
      expect(userRow?.verified_at).toBeTruthy();

      const verificationRow = await env.DB.prepare(
        "SELECT used_at FROM email_verifications WHERE user_id = (SELECT id FROM users WHERE email = ?1)",
      )
        .bind(payload.email.toLowerCase())
        .first<{ used_at: string | null }>();
      expect(verificationRow?.used_at).toBeTruthy();
    } finally {
      dispose();
    }
  });

  it("rejects expired verification links with a 400", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const payload = {
        email: "expire-me@example.com",
        password: "Expire123!",
        firstName: "Expire",
        lastName: "Test",
      };
      const signupReq = new Request("https://app.test/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      await handleSignup(signupReq, env);
      const callPayload = mockedSendVerification.mock.calls.at(-1)?.[1] as EmailVerificationNotificationPayload | undefined;
      expect(callPayload).toBeDefined();
      const token = callPayload ? new URL(callPayload.verifyUrl).searchParams.get("token") : null;
      expect(token).toBeTruthy();

      await env.DB.prepare(
        `UPDATE email_verifications
            SET expires_at = datetime('now', '-1 hour')
          WHERE user_id = (SELECT id FROM users WHERE email = ?1)`,
      )
        .bind(payload.email.toLowerCase())
        .run();

      const tokenValue = token as string;
      const verifyReq = new Request("https://app.test/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: tokenValue }),
      });
      const res = await handleVerifyEmail(verifyReq, env);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/expired/i);
    } finally {
      dispose();
    }
  });
});
