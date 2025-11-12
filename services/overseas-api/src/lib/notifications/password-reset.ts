import type { Env } from "../../env";
import { systemLogger } from "../../utils/logging";
import { maskEmail } from "../../utils/mask";

const log = systemLogger({ scope: "user-notifications" });

interface BaseNotificationPayload {
  email: string;
  expiresAt: string;
  [key: string]: unknown;
}

export interface PasswordResetNotificationPayload extends BaseNotificationPayload {
  resetUrl: string;
}

export interface EmailVerificationNotificationPayload extends BaseNotificationPayload {
  verifyUrl: string;
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

async function dispatchUserNotification<T extends BaseNotificationPayload>(
  scope: string,
  endpoint: string | undefined,
  secret: string | undefined,
  payload: T,
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

  const maskedEmail = maskEmail(payload.email);

  log.info(`${scope}.webhook.dispatch`, {
    endpoint: new URL(endpoint).host,
    email: maskedEmail,
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
  const endpoint = env.EMAIL_VERIFICATION_WEBHOOK_URL?.trim();
  const secret = env.EMAIL_VERIFICATION_WEBHOOK_SECRET?.trim();
  if (!endpoint) {
    throw new Error("EMAIL_VERIFICATION_WEBHOOK_URL is not configured");
  }
  if (!secret) {
    throw new Error("EMAIL_VERIFICATION_WEBHOOK_SECRET is not configured");
  }
  await dispatchUserNotification("email_verification", endpoint, secret, payload);
}
