import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleLogin, handleSignup } from "../auth";
import { createWorkerEnv } from "../../../tests/helpers/worker-env";
import type { EmailVerificationNotificationPayload } from "../../lib/notifications/password-reset";
import * as notificationModule from "../../lib/notifications/password-reset";

vi.mock("../../lib/notifications/password-reset", () => ({
  sendPasswordResetNotification: vi.fn(),
  sendEmailVerificationNotification: vi.fn(),
}));

const mockedSendVerification = vi.mocked(notificationModule.sendEmailVerificationNotification);

describe("handleLogin verification enforcement", () => {
  beforeEach(() => {
    mockedSendVerification.mockReset();
  });

  it("throttles verification resends when login is retried within the cooldown window", async () => {
    const { env, dispose } = await createWorkerEnv({
      EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: "900",
    });
    try {
      const signupReq = new Request("https://app.test/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "pending-login@example.com",
          password: "Pending123!",
          firstName: "Pending",
          lastName: "User",
        }),
      });
      await handleSignup(signupReq, env);
      mockedSendVerification.mockClear();

      const loginReq = new Request("https://app.test/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "pending-login@example.com", password: "Pending123!" }),
      });

      const first = await handleLogin(loginReq, env);
      expect(first.status).toBe(403);
      expect(await first.json()).toMatchObject({ error: "Email verification required" });
      expect(mockedSendVerification).toHaveBeenCalledTimes(1);
      const firstPayload = mockedSendVerification.mock.calls[0]?.[1] as EmailVerificationNotificationPayload;
      expect(firstPayload.email).toBe("pending-login@example.com");

      const second = await handleLogin(loginReq, env);
      expect(second.status).toBe(429);
      expect(await second.json()).toMatchObject({
        error: "Please wait before requesting another verification email.",
      });
      expect(mockedSendVerification).toHaveBeenCalledTimes(1);
    } finally {
      dispose();
    }
  });
});
