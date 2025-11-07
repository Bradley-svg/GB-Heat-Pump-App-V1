import * as SecureStore from "expo-secure-store";

const COOKIE_KEY = "gb_session_cookie";
const PENDING_LOGOUT_KEY = "gb_pending_logout_cookie";
let inMemoryCookie: string | null = null;

export async function loadSessionCookie(): Promise<string | null> {
  if (inMemoryCookie !== null) return inMemoryCookie;
  const stored = await SecureStore.getItemAsync(COOKIE_KEY);
  inMemoryCookie = stored ?? null;
  return inMemoryCookie;
}

export async function persistSessionCookie(cookie: string): Promise<void> {
  inMemoryCookie = cookie;
  await SecureStore.setItemAsync(COOKIE_KEY, cookie);
}

export async function clearSessionCookie(): Promise<void> {
  inMemoryCookie = null;
  await SecureStore.deleteItemAsync(COOKIE_KEY);
}

export function getCachedSessionCookie(): string | undefined {
  return inMemoryCookie ?? undefined;
}

export async function persistPendingLogoutCookie(cookie: string): Promise<void> {
  await SecureStore.setItemAsync(PENDING_LOGOUT_KEY, cookie);
}

export async function loadPendingLogoutCookie(): Promise<string | null> {
  return (await SecureStore.getItemAsync(PENDING_LOGOUT_KEY)) ?? null;
}

export async function clearPendingLogoutCookie(): Promise<void> {
  await SecureStore.deleteItemAsync(PENDING_LOGOUT_KEY);
}
