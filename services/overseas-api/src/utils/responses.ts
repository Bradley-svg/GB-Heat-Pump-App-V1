export const JSON_CT = "application/json;charset=utf-8";
export const HTML_CT = "text/html;charset=utf-8";
export const SVG_CT = "image/svg+xml;charset=utf-8";

export interface SecurityHeaderOptions {
  scriptSrc?: string[];
  scriptHashes?: string[];
  scriptNonces?: string[];
  styleHashes?: string[];
  styleNonces?: string[];
  styleSrc?: string[];
  connectSrc?: string[];
  imgSrc?: string[];
  fontSrc?: string[];
}

const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "camera=()",
  "display-capture=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

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
  appendUnique(scriptSrc, options.scriptSrc);
  appendUnique(scriptSrc, options.scriptHashes);
  appendUnique(scriptSrc, options.scriptNonces);

  const styleSrc = ["'self'"];
  appendUnique(styleSrc, options.styleHashes);
  appendUnique(styleSrc, options.styleNonces);
  appendUnique(styleSrc, options.styleSrc);

  const connectSrc = ["'self'"];
  appendUnique(connectSrc, options.connectSrc);

  const imgSrc = ["'self'", "data:"];
  appendUnique(imgSrc, options.imgSrc);

  const fontSrc = ["'self'", "data:"];
  appendUnique(fontSrc, options.fontSrc);

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    `img-src ${imgSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    `font-src ${fontSrc.join(" ")}`,
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
  h.set("Permissions-Policy", PERMISSIONS_POLICY);

  return new Response(res.body, {
    headers: h,
    status: res.status,
    statusText: res.statusText,
  });
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers({ "content-type": JSON_CT });
  if (init.headers) {
    const initHeaders = new Headers(init.headers);
    initHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }
  const responseInit: ResponseInit = { ...init, headers };
  return withSecurityHeaders(new Response(JSON.stringify(data), responseInit));
}

export function text(body: string, init: ResponseInit = {}) {
  return withSecurityHeaders(new Response(body, init));
}
