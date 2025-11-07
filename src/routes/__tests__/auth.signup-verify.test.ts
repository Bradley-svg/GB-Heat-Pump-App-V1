import { describe, it, expect, beforeEach, vi } from "vitest";

import { handleSignup, handleVerifyEmail, handleResendVerification } from "../auth";
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

  it("resends verification for pending accounts", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const payload = {
        email: "pending-resend@example.com",
        password: "Pending123!",
        firstName: "Pending",
        lastName: "User",
      };
      const signupReq = new Request("https://app.test/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      await handleSignup(signupReq, env);
      mockedSendVerification.mockClear();

      const resendReq = new Request("https://app.test/api/auth/verify/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: payload.email }),
      });
      const res = await handleResendVerification(resendReq, env);
      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body).toEqual({ ok: true });
      expect(mockedSendVerification).toHaveBeenCalledTimes(1);
    } finally {
      dispose();
    }
  });

  it("ignores resend requests for unknown emails", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const req = new Request("https://app.test/api/auth/verify/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "missing@example.com" }),
      });
      const res = await handleResendVerification(req, env);
      expect(res.status).toBe(202);
      expect(await res.json()).toEqual({ ok: true });
      expect(mockedSendVerification).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it("skips resend when the account is already verified", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const payload = {
        email: "verified-resend@example.com",
        password: "Verified123!",
        firstName: "Verified",
        lastName: "User",
      };
      const signupReq = new Request("https://app.test/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      await handleSignup(signupReq, env);
      const token = mockedSendVerification.mock.calls.at(-1)?.[1]?.verifyUrl;
      expect(token).toBeDefined();

      const verifyReq = new Request("https://app.test/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: new URL(token as string).searchParams.get("token") }),
      });
      await handleVerifyEmail(verifyReq, env);
      mockedSendVerification.mockClear();

      const resendReq = new Request("https://app.test/api/auth/verify/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: payload.email }),
      });
      const res = await handleResendVerification(resendReq, env);
      expect(res.status).toBe(202);
      expect(await res.json()).toEqual({ ok: true });
      expect(mockedSendVerification).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it("throttles resend attempts within the cooldown window", async () => {
    const { env, dispose } = await createWorkerEnv({
      EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: "600",
    });
    try {
      const payload = {
        email: "throttle@example.com",
        password: "Throttle123!",
        firstName: "Throttle",
        lastName: "User",
      };
      const signupReq = new Request("https://app.test/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      await handleSignup(signupReq, env);

      const resendReq = new Request("https://app.test/api/auth/verify/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: payload.email }),
      });
      const first = await handleResendVerification(resendReq, env);
      expect(first.status).toBe(202);

      const second = await handleResendVerification(resendReq, env);
      expect(second.status).toBe(429);
      const body = await second.json();
      expect(body.error).toMatch(/wait/i);
    } finally {
      dispose();
    }
  });
});
