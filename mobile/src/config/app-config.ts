import Constants from "expo-constants";

const FALLBACK_API_BASE = "https://app.greenbro.com";

function sanitizeBase(base: string): string {
  return base.replace(/\/+$/, "");
}

export function getApiBase(): string {
  const envBase = process.env.EXPO_PUBLIC_API_BASE;
  const extraBase =
    typeof Constants.expoConfig?.extra?.apiBase === "string"
      ? Constants.expoConfig?.extra?.apiBase
      : undefined;
  return sanitizeBase(envBase ?? extraBase ?? FALLBACK_API_BASE);
}

export function buildApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${normalized}`;
}
