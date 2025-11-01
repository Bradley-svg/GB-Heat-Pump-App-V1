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

function normalizeConfiguredBase(
  value: string | undefined,
  fallback: string,
  { ensureTrailingSlash = false }: { ensureTrailingSlash?: boolean } = {},
) {
  const trimmed = value?.trim() ?? "";
  let normalized = trimmed.length ? trimmed : fallback;
  if (ensureTrailingSlash && !normalized.endsWith("/")) {
    normalized = `${normalized}/`;
  }
  return normalized;
}

export function resolveAppConfig(env: Env): ResolvedAppConfig {
  return {
    apiBase: normalizeConfiguredBase(env.APP_API_BASE, DEFAULT_APP_CONFIG.apiBase),
    assetBase: normalizeConfiguredBase(env.APP_ASSET_BASE, DEFAULT_APP_CONFIG.assetBase, {
      ensureTrailingSlash: true,
    }),
    returnDefault: env.RETURN_DEFAULT,
  };
}

export function serializeAppConfig(config: ResolvedAppConfig): string {
  const json = JSON.stringify(config);
  return json.replace(JSON_HTML_SAFE_CHARS, (char) => JSON_HTML_SAFE_REPLACEMENTS[char] ?? char);
}
