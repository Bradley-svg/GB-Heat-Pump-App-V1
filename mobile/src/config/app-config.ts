import Constants from "expo-constants";

const FALLBACK_API_BASE = "https://app.greenbro.com";
const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

function normalizeApiBase(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("//")) {
    return null;
  }
  try {
    const url = new URL(trimmed);
    if (!ALLOWED_SCHEMES.has(url.protocol)) {
      return null;
    }
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "");
    let serialized = url.toString();
    serialized = serialized.replace(/\/+$/, "");
    return serialized;
  } catch {
    return null;
  }
}

export function getApiBase(): string {
  const envBase = normalizeApiBase(process.env.EXPO_PUBLIC_API_BASE);
  const configApiBase = Constants.expoConfig?.extra?.apiBase;
  const extraBase =
    typeof configApiBase === "string" ? normalizeApiBase(configApiBase) : null;
  return envBase ?? extraBase ?? FALLBACK_API_BASE;
}

export function buildApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${normalized}`;
}
