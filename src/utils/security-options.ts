import type { Env } from "../env";
import type { SecurityHeaderOptions } from "./responses";
import { resolveAppConfig } from "../app-config";

const SECURITY_OPTION_KEYS: Array<keyof SecurityHeaderOptions> = [
  "scriptHashes",
  "scriptNonces",
  "styleHashes",
  "styleNonces",
  "styleSrc",
  "connectSrc",
  "imgSrc",
  "fontSrc",
];

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function extractOrigin(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (ALLOWED_PROTOCOLS.has(url.protocol)) {
      return url.origin;
    }
  } catch {
    // Ignore invalid URLs or relative paths – they should not expand CSP beyond 'self'.
  }
  return null;
}

function mergeList(base?: string[], extra?: string[]): string[] | undefined {
  if (!base && !extra) return undefined;
  const combined = [...(base ?? [])];
  if (extra) {
    for (const value of extra) {
      if (!combined.includes(value)) {
        combined.push(value);
      }
    }
  }
  return combined.length ? combined : undefined;
}

function cloneOptions(source: SecurityHeaderOptions): SecurityHeaderOptions {
  const clone: SecurityHeaderOptions = {};
  for (const key of SECURITY_OPTION_KEYS) {
    const list = source[key];
    if (list && list.length) {
      clone[key] = [...list];
    }
  }
  return clone;
}

export function baseSecurityHeaderOptions(env: Env): SecurityHeaderOptions {
  const config = resolveAppConfig(env);
  const apiOrigin = extractOrigin(config.apiBase);
  const assetOrigin = extractOrigin(config.assetBase);

  const base: SecurityHeaderOptions = {};

  const connectSources: string[] = [];
  if (apiOrigin) connectSources.push(apiOrigin);
  if (assetOrigin) connectSources.push(assetOrigin);
  if (connectSources.length) {
    base.connectSrc = connectSources;
  }

  if (assetOrigin) {
    base.imgSrc = [assetOrigin];
    base.styleSrc = [assetOrigin];
    base.fontSrc = [assetOrigin];
  }

  return base;
}

export function mergeSecurityHeaderOptions(
  base: SecurityHeaderOptions,
  overrides?: SecurityHeaderOptions,
): SecurityHeaderOptions {
  if (!overrides) {
    return cloneOptions(base);
  }

  const merged: SecurityHeaderOptions = {};

  for (const key of SECURITY_OPTION_KEYS) {
    const combined = mergeList(base[key], overrides[key]);
    if (combined && combined.length) {
      merged[key] = combined;
    }
  }

  return merged;
}

export function createSecurityHeaderOptions(
  env: Env,
  overrides?: SecurityHeaderOptions,
): SecurityHeaderOptions {
  const base = baseSecurityHeaderOptions(env);
  return mergeSecurityHeaderOptions(base, overrides);
}
