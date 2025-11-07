import type { Env } from "../../env";
import { systemLogger } from "../../utils/logging";

const log = systemLogger({ scope: "password-reset" });

export interface PasswordResetNotificationPayload {
  email: string;
  resetUrl: string;
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

  const body = JSON.stringify(payload);
  const headers = new Headers({
    "content-type": "application/json",
    accept: "application/json, */*",
    "user-agent": "greenbro-worker/password-reset",
  });
  if (env.PASSWORD_RESET_WEBHOOK_SECRET) {
    headers.set("authorization", `Bearer ${env.PASSWORD_RESET_WEBHOOK_SECRET.trim()}`);
    try {
      headers.set("x-reset-signature", await signPayload(env.PASSWORD_RESET_WEBHOOK_SECRET.trim(), body));
    } catch (error) {
      log.warn("password_reset.signature_failed", { error });
    }
  }

  log.info("password_reset.webhook.dispatch", {
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
    log.warn("password_reset.webhook_failed", {
      endpoint,
      status: response.status,
      response: responseBody ? responseBody.slice(0, 200) : null,
    });
    throw new Error(
      `Password reset webhook failed with status ${response.status}${
        responseBody ? `: ${responseBody.slice(0, 200)}` : ""
      }`,
    );
  }

  log.info("password_reset.webhook_succeeded", {
    endpoint,
    status: response.status,
  });
}
