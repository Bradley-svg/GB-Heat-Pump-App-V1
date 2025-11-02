import type { Env } from "../env";
import { json, withSecurityHeaders } from "../utils/responses";

const ALLOW_METHODS = "GET,POST,OPTIONS";
const ALLOW_HEADERS =
  "content-type,cf-access-jwt-assertion,x-greenbro-device-key,x-greenbro-signature,x-greenbro-timestamp";

export const CORS_BASE: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": ALLOW_METHODS,
  "access-control-allow-headers": ALLOW_HEADERS,
};

export interface CorsEvaluation {
  allowed: boolean;
  origin: string | null;
  allowOrigin: string | null;
}

function parseAllowedOrigins(env: Env): { origins: string[]; configured: boolean } {
  const raw = env.INGEST_ALLOWED_ORIGINS;
  if (typeof raw !== "string") {
    return { origins: [], configured: false };
  }
  const origins = raw
    .split(/[, \n\r]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return { origins, configured: origins.length > 0 };
}

function matchesOrigin(origin: string, rule: string) {
  if (rule === "*") return true;
  const normOrigin = origin.toLowerCase();
  const normRule = rule.toLowerCase();
  if (normRule.startsWith("*.")) {
    const suffix = normRule.slice(1);
    return normOrigin.endsWith(suffix);
  }
  return normOrigin === normRule;
}

export function evaluateCors(req: Request, env: Env): CorsEvaluation {
  const origin = req.headers.get("Origin");
  const { origins: allowedOrigins, configured } = parseAllowedOrigins(env);
  if (!configured) {
    return { allowed: false, origin: origin ?? null, allowOrigin: null };
  }
  if (!origin) {
    const allowAny = allowedOrigins.includes("*");
    return {
      allowed: true,
      origin: null,
      allowOrigin: allowAny ? "*" : null,
    };
  }

  for (const candidate of allowedOrigins) {
    if (matchesOrigin(origin, candidate)) {
      const allowOrigin = candidate === "*" ? "*" : origin;
      return { allowed: true, origin, allowOrigin };
    }
  }

  return { allowed: false, origin, allowOrigin: null };
}

export function withCors(
  req: Request,
  env: Env,
  res: Response,
  evaluation?: CorsEvaluation,
) {
  const result = evaluation ?? evaluateCors(req, env);
  const headers = new Headers(res.headers);
  if (result.allowOrigin) {
    headers.set("access-control-allow-origin", result.allowOrigin);
  } else {
    headers.delete("access-control-allow-origin");
  }
  headers.set("access-control-allow-methods", ALLOW_METHODS);
  headers.set("access-control-allow-headers", ALLOW_HEADERS);
  headers.set("vary", "origin");
  return new Response(res.body, {
    headers,
    status: res.status,
    statusText: res.statusText,
  });
}

export function maybeHandlePreflight(req: Request, pathname: string, env: Env) {
  if (req.method !== "OPTIONS") return null;

  if (
    pathname.startsWith("/api/ingest/") ||
    pathname.startsWith("/api/heartbeat/") ||
    /^\/api\/devices\/[^/]+\/latest$/.test(pathname)
  ) {
    const evaluation = evaluateCors(req, env);
    if (!evaluation.allowed) {
      return withCors(
        req,
        env,
        json({ error: "Origin not allowed" }, { status: 403 }),
        evaluation,
      );
    }
    const headers = new Headers({
      "access-control-allow-methods": ALLOW_METHODS,
      "access-control-allow-headers": ALLOW_HEADERS,
      "access-control-max-age": "600",
      vary: "origin",
    });
    if (evaluation.allowOrigin) {
      headers.set("access-control-allow-origin", evaluation.allowOrigin);
    }
    return withSecurityHeaders(new Response("", { status: 204, headers }));
  }
  return null;
}
