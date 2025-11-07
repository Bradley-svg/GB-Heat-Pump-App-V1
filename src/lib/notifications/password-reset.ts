import type { Env } from "../../env";
import { systemLogger } from "../../utils/logging";

const log = systemLogger({ scope: "user-notifications" });

export interface PasswordResetNotificationPayload {
  email: string;
  resetUrl: string;
  expiresAt: string;
}

export interface EmailVerificationNotificationPayload {
  email: string;
  verifyUrl: string;
  expiresAt: string;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (const byte of view) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function signPayload(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return bytesToBase64(digest);
}

async function dispatchUserNotification(
  scope: string,
  endpoint: string | undefined,
  secret: string | undefined,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!endpoint) {
    throw new Error(`${scope}_WEBHOOK_URL is not configured`);
  }

  const body = JSON.stringify(payload);
  const headers = new Headers({
    "content-type": "application/json",
    accept: "application/json, */*",
    "user-agent": `greenbro-worker/${scope}`,
  });
  if (secret) {
    headers.set("authorization", `Bearer ${secret.trim()}`);
    try {
      headers.set("x-user-event-signature", await signPayload(secret.trim(), body));
    } catch (error) {
      log.warn(`${scope}.signature_failed`, { error });
    }
  }

  log.info(`${scope}.webhook.dispatch`, {
    endpoint: new URL(endpoint).host,
    email: payload.email,
    expires_at: payload.expiresAt,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    let responseBody: string | undefined;
    try {
      responseBody = await response.text();
    } catch {
      responseBody = undefined;
    }
    log.warn(`${scope}.webhook_failed`, {
      endpoint,
      status: response.status,
      response: responseBody ? responseBody.slice(0, 200) : null,
    });
    throw new Error(
      `${scope} webhook failed with status ${response.status}${
        responseBody ? `: ${responseBody.slice(0, 200)}` : ""
      }`,
    );
  }

  log.info(`${scope}.webhook_succeeded`, {
    endpoint,
    status: response.status,
  });
}

/**
 * Sends a password reset payload to the configured webhook.
 * The webhook must accept JSON and return a 2xx status to indicate success.
 */
export async function sendPasswordResetNotification(
  env: Env,
  payload: PasswordResetNotificationPayload,
): Promise<void> {
  await dispatchUserNotification(
    "password_reset",
    env.PASSWORD_RESET_WEBHOOK_URL?.trim(),
    env.PASSWORD_RESET_WEBHOOK_SECRET,
    payload,
  );
}

export async function sendEmailVerificationNotification(
  env: Env,
  payload: EmailVerificationNotificationPayload,
): Promise<void> {
  await dispatchUserNotification(
    "email_verification",
    env.EMAIL_VERIFICATION_WEBHOOK_URL?.trim() ?? env.PASSWORD_RESET_WEBHOOK_URL?.trim(),
    env.EMAIL_VERIFICATION_WEBHOOK_SECRET ?? env.PASSWORD_RESET_WEBHOOK_SECRET,
    payload,
  );
}
