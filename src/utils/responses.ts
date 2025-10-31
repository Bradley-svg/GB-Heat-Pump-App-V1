export const JSON_CT = "application/json;charset=utf-8";
export const HTML_CT = "text/html;charset=utf-8";
export const SVG_CT = "image/svg+xml;charset=utf-8";

export function withSecurityHeaders(res: Response) {
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://unpkg.com 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const h = new Headers(res.headers);
  h.set("Content-Security-Policy", csp);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "no-referrer");
  h.set("Cross-Origin-Opener-Policy", "same-origin");

  return new Response(res.body, {
    headers: h,
    status: res.status,
    statusText: res.statusText,
  });
}

export function json(data: unknown, init: ResponseInit = {}) {
  return withSecurityHeaders(
    new Response(JSON.stringify(data), {
      headers: { "content-type": JSON_CT },
      ...init,
    }),
  );
}

export function text(body: string, init: ResponseInit = {}) {
  return withSecurityHeaders(new Response(body, init));
}
