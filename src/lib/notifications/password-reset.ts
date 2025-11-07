import type { Env } from "../../env";

export interface PasswordResetNotificationPayload {
  email: string;
  resetUrl: string;
  token: string;
  expiresAt: string;
}

/**
 * Sends a password reset payload to the configured webhook.
 * The webhook must accept JSON and return a 2xx status to indicate success.
 */
export async function sendPasswordResetNotification(
  env: Env,
  payload: PasswordResetNotificationPayload,
): Promise<void> {
  const endpoint = env.PASSWORD_RESET_WEBHOOK_URL?.trim();
  if (!endpoint) {
    throw new Error("PASSWORD_RESET_WEBHOOK_URL is not configured");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, */*",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let responseBody: string | undefined;
    try {
      responseBody = await response.text();
    } catch {
      responseBody = undefined;
    }
    throw new Error(
      `Password reset webhook failed with status ${response.status}${
        responseBody ? `: ${responseBody.slice(0, 200)}` : ""
      }`,
    );
  }
}

