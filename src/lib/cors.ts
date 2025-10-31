import { withSecurityHeaders } from "./http";

export const CORS_BASE: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,cf-access-jwt-assertion,x-greenbro-device-key",
};

export function withCors(res: Response) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_BASE)) h.set(k, v);
  return new Response(res.body, { headers: h, status: res.status, statusText: res.statusText });
}

export function maybeHandlePreflight(req: Request, pathname: string) {
  if (req.method !== "OPTIONS") return null;
  if (
    pathname.startsWith("/api/ingest/") ||
    pathname.startsWith("/api/heartbeat/") ||
    /^\/api\/devices\/[^/]+\/latest$/.test(pathname)
  ) {
    return withSecurityHeaders(new Response("", { status: 204, headers: CORS_BASE }));
  }
  return null;
}
