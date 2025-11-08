import { apiClient } from "./api-client";
import { buildApiUrl } from "../config/app-config";
import type { TelemetryGrant } from "./telemetry-auth";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  email: string;
  roles: string[];
  clientIds?: string[];
  firstName?: string | null;
  lastName?: string | null;
  sessionExpiresAt?: string;
}

interface LoginResponse {
  user: AuthUser;
  telemetry?: TelemetryGrant;
}

const SESSION_COOKIE_NAME = "gb_session";

export async function loginWithCredentials(
  payload: LoginPayload,
): Promise<{ user: AuthUser; cookie: string; telemetry?: TelemetryGrant }> {
  const response = await fetch(buildApiUrl("/api/auth/login"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const body = await safeJson<LoginResponse>(response);
  if (!response.ok) {
    const message =
      typeof body === "object" && body && "error" in body
        ? String((body as Record<string, unknown>).error)
        : "Unable to sign in";
    throw new Error(message);
  }
  const cookieHeader =
    response.headers.get("set-cookie") ?? response.headers.get("Set-Cookie");
  const sessionCookie = extractSessionCookie(cookieHeader);
  if (!sessionCookie) {
    throw new Error("Missing session cookie");
  }
  return { user: body.user, cookie: sessionCookie, telemetry: body.telemetry };
}

export async function logoutSession(): Promise<void> {
  await apiClient.post("/api/auth/logout", {});
}

export async function resendVerification(email: string): Promise<void> {
  await apiClient.post("/api/auth/verify/resend", { email });
}

async function safeJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid server response");
  }
}

function extractSessionCookie(raw: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`, "i"));
  if (!match) return null;
  return `${SESSION_COOKIE_NAME}=${match[1]}`;
}
