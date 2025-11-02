import "../helpers/setup";

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockR2Bucket } from "../helpers/mock-r2";
import { createWorkerEnv } from "../helpers/worker-env";

const SIGNING_SECRET = "test-signing-secret";
const ALLOWED_PREFIXES = "brand/";

const jwtVerifyMock = vi.fn(async (token: string) => {
  if (token !== "valid-access-token") {
    throw new Error("invalid token");
  }
  return { payload: { sub: "smoke-test-user" } };
});

const createRemoteJWKSetMock = vi.fn(() => {
  return async () => undefined;
});

vi.mock("jose", () => ({
  createRemoteJWKSet: createRemoteJWKSetMock,
  jwtVerify: jwtVerifyMock,
}));

let worker: typeof import("../../src/app").default;

async function signUrl(method: string, key: string, secret: string, exp: number) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = `${method.toUpperCase()}\n${key}\n${exp}`;
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe.sequential("R2 adapter smoke checks", () => {
  let envCtx: Awaited<ReturnType<typeof createWorkerEnv>>;
  let env: import("../../src/env").Env;
  let bucket: ReturnType<typeof createMockR2Bucket>;

  beforeAll(async () => {
    worker = (await import("../../src/app")).default;
  });

  beforeEach(async () => {
    bucket = createMockR2Bucket();
    envCtx = await createWorkerEnv({
      GB_BUCKET: bucket.bucket,
      ASSET_SIGNING_SECRET: SIGNING_SECRET,
      ALLOWED_PREFIXES: ALLOWED_PREFIXES,
    });
    env = envCtx.env;
    jwtVerifyMock.mockClear();
    createRemoteJWKSetMock.mockClear();
  });

  afterEach(() => {
    envCtx?.dispose();
  });

  it("serves signed GET/HEAD responses with CORS headers", async () => {
    await bucket.bucket.put("brand/logo.txt", "hello world", {
      httpMetadata: { contentType: "text/plain" },
    });

    const unauthorized = await worker.fetch(
      new Request("https://example.com/r2/brand/logo.txt"),
      env,
    );
    expect(unauthorized.status).toBe(401);

    const now = Math.floor(Date.now() / 1000);
    const headSig = await signUrl("HEAD", "brand/logo.txt", SIGNING_SECRET, now + 60);
    const headUrl = `https://example.com/r2/brand/logo.txt?exp=${now + 60}&sig=${headSig}`;
    const headRes = await worker.fetch(new Request(headUrl, { method: "HEAD" }), env);
    expect(headRes.status).toBe(200);
    expect(headRes.headers.get("content-length")).toBe(String("hello world".length));
    expect(headRes.headers.get("access-control-allow-origin")).toBe("*");

    const getSig = await signUrl("GET", "brand/logo.txt", SIGNING_SECRET, now + 120);
    const getUrl = `https://example.com/r2/brand/logo.txt?exp=${now + 120}&sig=${getSig}`;
    const getRes = await worker.fetch(new Request(getUrl, { method: "GET" }), env);
    expect(getRes.status).toBe(200);
    expect(await getRes.text()).toBe("hello world");
    expect(getRes.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("accepts authenticated PUT and blocks disallowed prefixes", async () => {
    const putReq = new Request("https://example.com/r2/brand/upload.json", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "Cf-Access-Jwt-Assertion": "valid-access-token",
      },
      body: JSON.stringify({ ok: true }),
    });

    const putRes = await worker.fetch(putReq, env);
    expect(putRes.status).toBe(200);
    expect(await putRes.json()).toEqual({ ok: true, key: "brand/upload.json" });
    expect(jwtVerifyMock).toHaveBeenCalledTimes(1);
    expect(await bucket.readText("brand/upload.json")).toBe('{"ok":true}');

    const forbiddenRes = await worker.fetch(
      new Request("https://example.com/r2/private/blocked.txt", {
        method: "PUT",
        headers: {
          "content-type": "text/plain",
          "Cf-Access-Jwt-Assertion": "valid-access-token",
        },
        body: "blocked",
      }),
      env,
    );
    expect(forbiddenRes.status).toBe(403);
  });

  it("returns permissive OPTIONS preflight headers", async () => {
    const optionsRes = await worker.fetch(
      new Request("https://example.com/r2/brand/sample.txt", {
        method: "OPTIONS",
        headers: {
          Origin: "https://example.com",
          "Access-Control-Request-Method": "PUT",
          "Access-Control-Request-Headers": "content-type,Cf-Access-Jwt-Assertion",
        },
      }),
      env,
    );

    expect(optionsRes.status).toBe(204);
    expect(optionsRes.headers.get("access-control-allow-origin")).toBe("*");
    expect(optionsRes.headers.get("access-control-allow-methods")).toContain("PUT");
    const allowedHeaders = optionsRes.headers.get("access-control-allow-headers") ?? "";
    expect(allowedHeaders.toLowerCase()).toContain("cf-access-jwt-assertion");
    expect(allowedHeaders.toLowerCase()).toContain("content-type");
  });
});
