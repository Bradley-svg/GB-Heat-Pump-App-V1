export interface AppConfig {
  apiBase: string;
  assetBase: string;
  returnDefault: string;
}

const DEFAULT_APP_CONFIG: AppConfig = {
  apiBase: "",
  assetBase: "/app/assets/",
  returnDefault: "/",
};

const HTTP_SCHEMES = new Set(["http:", "https:"]);
const ABSOLUTE_SCHEME = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

export function readAppConfig(): AppConfig {
  if (typeof window === "undefined") {
    return DEFAULT_APP_CONFIG;
  }
  const raw = window.__APP_CONFIG__ ?? {};
  return {
    apiBase: typeof raw.apiBase === "string" ? raw.apiBase : DEFAULT_APP_CONFIG.apiBase,
    assetBase: typeof raw.assetBase === "string" ? raw.assetBase : DEFAULT_APP_CONFIG.assetBase,
    returnDefault:
      typeof raw.returnDefault === "string" ? raw.returnDefault : DEFAULT_APP_CONFIG.returnDefault,
  };
}

function isSafeRelativePath(candidate: string): boolean {
  return candidate.startsWith("/") && !candidate.startsWith("//");
}

function sanitizeReturnCandidate(raw: string | null, config: AppConfig): string {
  const fallback = config.returnDefault;
  const candidate = raw?.trim();
  if (!candidate) return fallback;
  if (isSafeRelativePath(candidate)) {
    return candidate;
  }
  if (candidate.startsWith("//") || typeof window === "undefined") {
    return fallback;
  }

  try {
    const allowedOrigins = new Set<string>([window.location.origin]);
    try {
      const fallbackUrl = new URL(config.returnDefault, window.location.origin);
      allowedOrigins.add(fallbackUrl.origin);
    } catch {
      // ignore parse issues
    }
    const parsed = new URL(candidate, window.location.origin);
    if (!HTTP_SCHEMES.has(parsed.protocol)) {
      return fallback;
    }
    if (!allowedOrigins.has(parsed.origin)) {
      return fallback;
    }
    if (ABSOLUTE_SCHEME.test(candidate)) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function resolveReturnUrl(config: AppConfig): string {
  if (typeof window === "undefined") {
    return config.returnDefault;
  }
  const search = new URLSearchParams(window.location.search);
  return sanitizeReturnCandidate(search.get("return"), config);
}
