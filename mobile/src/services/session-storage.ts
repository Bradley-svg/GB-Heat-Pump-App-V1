import * as SecureStore from "expo-secure-store";
import type { TelemetryGrant } from "./telemetry-auth";

const COOKIE_KEY = "gb_session_cookie";
const PENDING_LOGOUT_KEY = "gb_pending_logout_cookie";
const TELEMETRY_GRANT_KEY = "gb_telemetry_grant";

export async function loadSessionCookie(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(COOKIE_KEY);
  return stored ?? null;
}

export async function persistSessionCookie(cookie: string): Promise<void> {
  await SecureStore.setItemAsync(COOKIE_KEY, cookie);
}

export async function clearSessionCookie(): Promise<void> {
  await SecureStore.deleteItemAsync(COOKIE_KEY);
}

export async function persistTelemetryGrant(grant: TelemetryGrant): Promise<void> {
  await SecureStore.setItemAsync(
    TELEMETRY_GRANT_KEY,
    JSON.stringify({
      token: grant.token,
      expiresAt: grant.expiresAt ?? null,
    }),
  );
}

export async function loadTelemetryGrant(): Promise<TelemetryGrant | null> {
  const stored = await SecureStore.getItemAsync(TELEMETRY_GRANT_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return normalizeTelemetryGrant(parsed);
  } catch {
    const token = stored.trim();
    return token ? { token, expiresAt: null } : null;
  }
}

export async function clearTelemetryGrant(): Promise<void> {
  await SecureStore.deleteItemAsync(TELEMETRY_GRANT_KEY);
}

export async function persistPendingLogoutCookie(cookie: string, telemetry?: TelemetryGrant | null): Promise<void> {
  const payload: PendingLogoutRecord = {
    cookie,
    telemetry: normalizeTelemetryGrant(telemetry),
  };
  await SecureStore.setItemAsync(PENDING_LOGOUT_KEY, JSON.stringify(payload));
}

export async function loadPendingLogoutCookie(): Promise<PendingLogoutRecord | null> {
  const stored = await SecureStore.getItemAsync(PENDING_LOGOUT_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed.cookie === "string" && parsed.cookie.length > 0) {
      return {
        cookie: parsed.cookie,
        telemetry: normalizeTelemetryGrant(parsed.telemetry),
      };
    }
  } catch {
    // fall through to legacy string handling
  }
  return {
    cookie: stored,
    telemetry: null,
  };
}

export async function clearPendingLogoutCookie(): Promise<void> {
  await SecureStore.deleteItemAsync(PENDING_LOGOUT_KEY);
}

export type PendingLogoutRecord = {
  cookie: string;
  telemetry: TelemetryGrant | null;
};

function normalizeTelemetryGrant(input: unknown): TelemetryGrant | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const tokenCandidate = (input as { token?: unknown }).token;
  const token = typeof tokenCandidate === "string" ? tokenCandidate.trim() : "";
  if (!token) {
    return null;
  }
  const expiresCandidate = (input as { expiresAt?: unknown }).expiresAt;
  return {
    token,
    expiresAt: typeof expiresCandidate === "string" ? expiresCandidate : null,
  };
}
