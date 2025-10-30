/// <reference types="@cloudflare/workers-types" />

export interface Env {
  GB_BUCKET: R2Bucket;
}

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,PUT,DELETE,HEAD,OPTIONS",
  "access-control-allow-headers": "content-type,content-disposition",
};

function withCors(res: Response, extra: Record<string, string> = {}) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) h.set(k, v);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: h,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const key = url.pathname.replace(/^\/+/, "");

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response("", { status: 204, headers: CORS_HEADERS });
    }

    if (!key) {
      return withCors(new Response("Missing key in path", { status: 400 }));
    }

    if (method === "PUT") {
      const contentType =
        request.headers.get("content-type") || "application/octet-stream";
      const contentDisposition =
        request.headers.get("content-disposition") || undefined;

      await env.GB_BUCKET.put(key, request.body as ReadableStream<Uint8Array>, {
        httpMetadata: { contentType, contentDisposition },
      });

      return withCors(new Response(`Put ${key} successfully!`));
    }

    if (method === "GET") {
      const obj = await env.GB_BUCKET.get(key);
      if (!obj) return withCors(new Response("Not found", { status: 404 }));

      const h = new Headers();
      if (obj.httpMetadata?.contentType) h.set("content-type", obj.httpMetadata.contentType);
      if (obj.httpMetadata?.contentDisposition) h.set("content-disposition", obj.httpMetadata.contentDisposition);
      if (obj.etag) h.set("etag", obj.etag);
      if (typeof obj.size === "number") h.set("content-length", String(obj.size));
      if (obj.uploaded) h.set("last-modified", obj.uploaded.toUTCString());

      return withCors(new Response(obj.body, { headers: h }));
    }

    if (method === "HEAD") {
      const head = await env.GB_BUCKET.head(key);
      if (!head) return withCors(new Response("", { status: 404 }));

      const h = new Headers();
      if (head.httpMetadata?.contentType) h.set("content-type", head.httpMetadata.contentType);
      if (head.httpMetadata?.contentDisposition) h.set("content-disposition", head.httpMetadata.contentDisposition);
      if (head.etag) h.set("etag", head.etag);
      if (typeof head.size === "number") h.set("content-length", String(head.size));
      if (head.uploaded) h.set("last-modified", head.uploaded.toUTCString());

      return withCors(new Response("", { status: 200, headers: h }));
    }

    if (method === "DELETE") {
      await env.GB_BUCKET.delete(key);
      return withCors(new Response(`Deleted ${key}`));
    }

    return withCors(
      new Response(`${method} is not allowed.`, {
        status: 405,
        headers: { Allow: "GET,PUT,DELETE,HEAD,OPTIONS" },
      }),
    );
  },
};
