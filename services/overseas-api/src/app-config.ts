import { normalizeAssetBase } from "./utils/asset-base";
import { systemLogger } from "./utils/logging";
import type { Env } from "./env";

export interface ResolvedAppConfig {
  apiBase: string;
  assetBase: string;
  returnDefault?: string;
}

export const DEFAULT_APP_CONFIG: Pick<ResolvedAppConfig, "apiBase" | "assetBase"> = {
  apiBase: "",
  assetBase: "/app/assets/",
};

const JSON_HTML_SAFE_CHARS = /[<>&\u2028\u2029]/g;
const JSON_HTML_SAFE_REPLACEMENTS: Record<string, string> = {
  "<": "\\u003C",
  ">": "\\u003E",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};
const ABSOLUTE_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const HTTP_SCHEME_PATTERN = /^https?:\/\//i;
const PLACEHOLDER_API_ORIGIN = "https://api-base.invalid";

function sanitizeApiPath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  if (collapsed.endsWith("/")) {
    return collapsed.replace(/\/+$/, "/");
  }
  return collapsed;
}

function normalizeApiBase(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }

  const hasScheme = ABSOLUTE_SCHEME_PATTERN.test(trimmed);
  if (hasScheme && !HTTP_SCHEME_PATTERN.test(trimmed)) {
    systemLogger({ scope: "app_config" }).warn("api_base_invalid_scheme", {
      value: trimmed,
      fallback,
    });
    return fallback;
  }

  try {
    const isRootRelative = trimmed.startsWith("/");
    const url = hasScheme ? new URL(trimmed) : new URL(trimmed, PLACEHOLDER_API_ORIGIN);
    url.pathname = sanitizeApiPath(url.pathname);
    const serialized = url.toString();
    if (hasScheme) {
      return serialized;
    }
    const withoutPlaceholder = serialized.replace(PLACEHOLDER_API_ORIGIN, "");
    if (isRootRelative) {
      return withoutPlaceholder;
    }
    return withoutPlaceholder.startsWith("/") ? withoutPlaceholder.slice(1) : withoutPlaceholder;
  } catch (error) {
    systemLogger({ scope: "app_config" }).warn("api_base_normalization_failed", {
      value: trimmed,
      fallback,
      error,
    });
    return fallback;
  }
}

export function resolveAppConfig(env: Env): ResolvedAppConfig {
  return {
    apiBase: normalizeApiBase(env.APP_API_BASE, DEFAULT_APP_CONFIG.apiBase),
    assetBase: normalizeAssetBase(env.APP_ASSET_BASE, DEFAULT_APP_CONFIG.assetBase),
    returnDefault: env.RETURN_DEFAULT,
  };
}

export function serializeAppConfig(config: ResolvedAppConfig): string {
  const json = JSON.stringify(config);
  return json.replace(JSON_HTML_SAFE_CHARS, (char) => JSON_HTML_SAFE_REPLACEMENTS[char] ?? char);
}
