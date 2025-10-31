export const JSON_CT = "application/json;charset=utf-8";
export const HTML_CT = "text/html;charset=utf-8";
export const SVG_CT = "image/svg+xml;charset=utf-8";

interface SecurityHeaderOptions {
  scriptHashes?: string[];
  scriptNonces?: string[];
  styleHashes?: string[];
  styleNonces?: string[];
}

function appendUnique(target: string[], values?: string[]) {
  if (!values) return;
  for (const value of values) {
    if (!target.includes(value)) {
      target.push(value);
    }
  }
}

export function withSecurityHeaders(res: Response, options: SecurityHeaderOptions = {}) {
  const scriptSrc = ["'self'"];
  appendUnique(scriptSrc, options.scriptHashes);
  appendUnique(scriptSrc, options.scriptNonces);

  const styleSrc = ["'self'"];
  appendUnique(styleSrc, options.styleHashes);
  appendUnique(styleSrc, options.styleNonces);

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
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
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

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
