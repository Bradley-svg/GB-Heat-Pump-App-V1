import { normalizeAssetBase } from "./utils/asset-base";
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
function normalizeApiBase(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : fallback;
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
