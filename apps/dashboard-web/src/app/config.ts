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
const DEFAULT_BASE_ORIGIN_FALLBACK = "http://localhost";

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

interface SanitizeReturnOptions {
  baseOrigin?: string | null;
  allowedOrigins?: string[];
}

export function readAppConfig(): AppConfig {
  if (typeof window === "undefined") {
    return DEFAULT_APP_CONFIG;
  }
  const raw = window.__APP_CONFIG__ ?? {};
  const rawReturnDefault =
    typeof raw.returnDefault === "string" ? raw.returnDefault : DEFAULT_APP_CONFIG.returnDefault;
  return {
    apiBase: typeof raw.apiBase === "string" ? raw.apiBase : DEFAULT_APP_CONFIG.apiBase,
    assetBase: typeof raw.assetBase === "string" ? raw.assetBase : DEFAULT_APP_CONFIG.assetBase,
    returnDefault: sanitizeConfiguredReturnDefault(rawReturnDefault),
  };
}

function isSafeRelativePath(candidate: string): boolean {
  return candidate.startsWith("/") && !candidate.startsWith("//");
}

function resolveWindowOrigin(): string | null {
  if (typeof window === "undefined" || !window.location) {
    return null;
  }
  try {
    return window.location.origin;
  } catch {
    return null;
  }
}

function sanitizeConfiguredReturnDefault(raw: string): string {
  const baseOrigin = resolveWindowOrigin();
  if (!baseOrigin) {
    return DEFAULT_APP_CONFIG.returnDefault;
  }
  return sanitizeReturnValue(raw, DEFAULT_APP_CONFIG.returnDefault, {
    baseOrigin,
    allowedOrigins: [DEFAULT_APP_CONFIG.returnDefault],
  });
}

function sanitizeReturnValue(
  raw: string | null | undefined,
  fallback: string,
  options: SanitizeReturnOptions = {},
): string {
  const candidate = raw?.trim();
  if (!candidate) return fallback;
  if (isSafeRelativePath(candidate)) {
    return candidate;
  }
  if (candidate.startsWith("//")) {
    return fallback;
  }

  const baseOrigin = options.baseOrigin ?? resolveWindowOrigin();
  const allowedOrigins = new Set(
    (options.allowedOrigins ?? []).filter((origin): origin is string => Boolean(origin)),
  );
  if (baseOrigin) {
    allowedOrigins.add(baseOrigin);
  }

  let fallbackOrigin: string | null = null;
  if (fallback) {
    try {
      fallbackOrigin = new URL(fallback, baseOrigin ?? DEFAULT_BASE_ORIGIN_FALLBACK).origin;
      allowedOrigins.add(fallbackOrigin);
    } catch {
      fallbackOrigin = null;
    }
  }

  const anchorOrigin = baseOrigin ?? fallbackOrigin;
  if (!anchorOrigin) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, anchorOrigin);
    if (!HTTP_SCHEMES.has(parsed.protocol)) {
      return fallback;
    }
    if (allowedOrigins.size && !allowedOrigins.has(parsed.origin)) {
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

function sanitizeReturnCandidate(raw: string | null, config: AppConfig): string {
  return sanitizeReturnValue(raw, config.returnDefault, {
    baseOrigin: resolveWindowOrigin(),
    allowedOrigins: [config.returnDefault],
  });
}

export function resolveReturnUrl(config: AppConfig): string {
  if (typeof window === "undefined") {
    return config.returnDefault;
  }
  const search = new URLSearchParams(window.location.search);
  return sanitizeReturnCandidate(search.get("return"), config);
}

