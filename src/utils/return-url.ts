import type { Env } from "../env";

const HTTP_SCHEMES = new Set(["http:", "https:"]);
const ABSOLUTE_SCHEME = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

function isSafeRelativePath(candidate: string): boolean {
  return candidate.startsWith("/") && !candidate.startsWith("//");
}

function collectAllowedOrigins(env: Env, requestOrigin: string): Set<string> {
  const origins = new Set<string>([requestOrigin]);
  try {
    const appUrl = new URL(env.APP_BASE_URL);
    origins.add(appUrl.origin);
  } catch {
    // ignore parse errors
  }
  if (env.RETURN_DEFAULT) {
    try {
      const fallbackUrl = new URL(env.RETURN_DEFAULT, requestOrigin);
      origins.add(fallbackUrl.origin);
    } catch {
      // ignore parse errors
    }
  }
  return origins;
}

export function resolveLogoutReturn(raw: string | null, env: Env, requestUrl: URL): string {
  const fallback = env.RETURN_DEFAULT ?? "/";
  const candidate = raw?.trim();
  if (!candidate) return fallback;

  if (isSafeRelativePath(candidate)) {
    return candidate;
  }
  if (candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, requestUrl.origin);
    if (!HTTP_SCHEMES.has(parsed.protocol)) {
      return fallback;
    }
    const allowedOrigins = collectAllowedOrigins(env, requestUrl.origin);
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
