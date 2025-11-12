import { systemLogger } from "./logging";

const PLACEHOLDER_ORIGIN = "https://asset-base.invalid";
const ABSOLUTE_SCHEME = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const ALLOWED_ABSOLUTE_SCHEMES = new Set(["http:", "https:"]);

class UnsupportedAssetSchemeError extends Error {
  readonly scheme: string;

  constructor(scheme: string) {
    super(`Unsupported asset base scheme: ${scheme}`);
    this.name = "UnsupportedAssetSchemeError";
    this.scheme = scheme.toLowerCase();
  }
}

type AssetBaseKind = "absolute" | "protocol-relative" | "root-relative" | "relative";

interface ParsedAssetBase {
  url: URL;
  kind: AssetBaseKind;
  original: string;
}

function parseAssetBase(raw: string): ParsedAssetBase {
  const trimmed = raw.trim();
  if (!trimmed) {
    const url = new URL("/", PLACEHOLDER_ORIGIN);
    return { url, kind: "root-relative", original: trimmed };
  }
  if (trimmed.startsWith("//")) {
    const url = new URL(`https:${trimmed}`);
    return { url, kind: "protocol-relative", original: trimmed };
  }
  if (ABSOLUTE_SCHEME.test(trimmed)) {
    const scheme = trimmed.slice(0, trimmed.indexOf(":") + 1).toLowerCase();
    if (!ALLOWED_ABSOLUTE_SCHEMES.has(scheme)) {
      throw new UnsupportedAssetSchemeError(scheme);
    }
    const url = new URL(trimmed);
    return { url, kind: "absolute", original: trimmed };
  }
  const url = new URL(trimmed, PLACEHOLDER_ORIGIN);
  const kind: AssetBaseKind = trimmed.startsWith("/") ? "root-relative" : "relative";
  return { url, kind, original: trimmed };
}

function ensureTrailingSlash(url: URL): void {
  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }
}

function serializeAssetUrl(parsed: ParsedAssetBase): string {
  const { url, kind } = parsed;
  const suffix = `${url.pathname}${url.search}${url.hash}`;
  switch (kind) {
    case "absolute":
      return url.toString();
    case "protocol-relative":
      return `//${url.host}${suffix}`;
    case "root-relative":
      return suffix;
    case "relative": {
      return suffix.startsWith("/") ? suffix.slice(1) : suffix;
    }
    default:
      return suffix;
  }
}

function splitSuffix(input: string): { path: string; search: string; hash: string } {
  const match = input.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  return {
    path: match?.[1] ?? "",
    search: match?.[2] ?? "",
    hash: match?.[3] ?? "",
  };
}

function combineQueryStrings(baseSearch: string, suffixSearch: string): string {
  const params = new URLSearchParams();
  if (suffixSearch) {
    const suffixParams = new URLSearchParams(suffixSearch.slice(1));
    suffixParams.forEach((value, key) => {
      params.append(key, value);
    });
  }
  if (baseSearch) {
    const baseParams = new URLSearchParams(baseSearch.slice(1));
    baseParams.forEach((value, key) => {
      params.append(key, value);
    });
  }
  const combined = params.toString();
  return combined ? `?${combined}` : "";
}

function manualEnsureTrailingSlash(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "/";
  const match = trimmed.match(/^([^?#]*)([?#].*)?$/);
  if (!match) return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  let path = match[1] ?? "";
  const suffix = match[2] ?? "";
  if (!path.endsWith("/")) {
    path = path ? `${path}/` : "/";
  }
  return `${path}${suffix}`;
}

function manualExpand(base: string, suffix: string): string {
  const baseMatch = base.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  if (!baseMatch) return base.endsWith("/") ? `${base}${suffix}` : `${base}/${suffix}`;
  let basePath = baseMatch[1] ?? "";
  const baseSearch = baseMatch[2] ?? "";
  const baseHash = baseMatch[3] ?? "";
  if (!basePath.endsWith("/")) {
    basePath = basePath ? `${basePath}/` : "/";
  }
  const suffixParts = splitSuffix(suffix);
  const combinedPath = `${basePath}${suffixParts.path}`;
  const combinedSearch = combineQueryStrings(baseSearch, suffixParts.search);
  const combinedHash = suffixParts.hash || baseHash;
  return `${combinedPath}${combinedSearch}${combinedHash}`;
}

export function normalizeAssetBase(value: string | undefined, fallback: string): string {
  const candidate = value?.trim()?.length ? value.trim() : fallback;
  try {
    const parsed = parseAssetBase(candidate);
    ensureTrailingSlash(parsed.url);
    return serializeAssetUrl(parsed);
  } catch (err) {
    if (err instanceof UnsupportedAssetSchemeError && candidate !== fallback) {
      systemLogger({ scope: "app_config" }).warn("asset_base_invalid_scheme", {
        value: candidate,
        fallback,
        scheme: err.scheme,
      });
    }
    if (candidate !== fallback) {
      return normalizeAssetBase(undefined, fallback);
    }
    return manualEnsureTrailingSlash(candidate);
  }
}

export function expandAssetBase(assetBase: string, suffix: string): string {
  const trimmedBase = assetBase.trim();
  if (!trimmedBase) {
    return suffix;
  }
  try {
    const parsed = parseAssetBase(trimmedBase);
    ensureTrailingSlash(parsed.url);
    const originalSearch = parsed.url.search;
    const originalHash = parsed.url.hash;
    const suffixParts = splitSuffix(suffix);
    parsed.url.pathname = `${parsed.url.pathname}${suffixParts.path}`;
    const combinedSearch = combineQueryStrings(originalSearch, suffixParts.search);
    parsed.url.search = combinedSearch ? combinedSearch.slice(1) : "";
    const finalHash = suffixParts.hash || originalHash;
    parsed.url.hash = finalHash ? finalHash.slice(1) : "";
    return serializeAssetUrl(parsed);
  } catch {
    return manualExpand(trimmedBase, suffix);
  }
}
