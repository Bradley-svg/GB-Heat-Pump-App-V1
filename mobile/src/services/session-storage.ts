import * as SecureStore from "expo-secure-store";

const COOKIE_KEY = "gb_session_cookie";
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
