import { Router } from "itty-router";
import { pseudonymizedRecordSchema } from "@greenbro/sdk-core";
import { z } from "zod";
import { verify } from "@noble/ed25519";
import { createRemoteJWKSet, jwtVerify } from "jose";

const ingestSchema = z.object({
  batchId: z.string(),
  records: z.array(pseudonymizedRecordSchema),
});

const heartbeatSchema = z.object({
  keyVersion: z.string(),
  timestamp: z.string().datetime(),
});

const router = Router();
const encoder = new TextEncoder();
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const DEFAULT_CLOCK_TOLERANCE = 5;

export interface Env {
  EXPORT_VERIFY_PUBKEY?: string;
  ACCESS_AUD?: string;
  ACCESS_JWKS_URL?: string;
}

export async function verifyBatchSignature(payload: unknown, signatureHeader: string, env: Env) {
  if (!signatureHeader) {
    throw new Response("missing batch signature", { status: 401 });
  }
  const verifyKey = env.EXPORT_VERIFY_PUBKEY?.trim();
  if (!verifyKey) {
    throw new Response("signing key not configured", { status: 503 });
  }
  const message = encoder.encode(JSON.stringify(payload));
  const isValid = await verify(base64ToBytes(signatureHeader), message, base64ToBytes(verifyKey));
  if (!isValid) {
    throw new Response("invalid signature", { status: 403 });
  }
}

router.get("/health", (_req, env: Env) =>
  new Response(
    JSON.stringify({
      status: "ok",
      signatureConfigured: Boolean(env.EXPORT_VERIFY_PUBKEY && env.EXPORT_VERIFY_PUBKEY.trim().length),
    }),
    { headers: { "Content-Type": "application/json" } },
  ),
);

router.post("/api/ingest/:profileId", async (request, env: Env) => {
  try {
    await requireAccessJwt(request, env);
  } catch (error) {
    return toResponse(error);
  }
  const token = request.headers.get("Authorization");
  if (!token) {
    return new Response("missing token", { status: 401 });
  }
  const body = await request.json();
  const payload = ingestSchema.parse(body);
  await verifyBatchSignature(payload, request.headers.get("X-Batch-Signature") ?? "", env);
  return new Response(
    JSON.stringify({
      status: "queued",
      accepted: payload.records.length,
    }),
    { headers: { "Content-Type": "application/json" }, status: 202 },
  );
});

router.post("/api/heartbeat/:profileId", async (request, env: Env) => {
  try {
    await requireAccessJwt(request, env);
  } catch (error) {
    return toResponse(error);
  }
  const body = await request.json();
  const payload = heartbeatSchema.parse(body);
  return new Response(JSON.stringify({ status: "ok", keyVersion: payload.keyVersion }), {
    headers: { "Content-Type": "application/json" },
  });
});

router.all("*", () => new Response("not found", { status: 404 }));

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router.handle(request, env, ctx),
};

async function requireAccessJwt(request: Request, env: Env) {
  const token =
    request.headers.get("CF-Access-Jwt-Assertion") ?? request.headers.get("cf-access-jwt-assertion");
  if (!token) {
    throw new Response("missing access assertion", { status: 401 });
  }
  const audience = env.ACCESS_AUD?.trim();
  const jwksUrl = env.ACCESS_JWKS_URL?.trim();
  if (!audience || !jwksUrl) {
    throw new Response("access configuration incomplete", { status: 500 });
  }
  try {
    await jwtVerify(token, getJwks(jwksUrl), {
      audience,
      issuer: deriveIssuer(jwksUrl),
      clockTolerance: DEFAULT_CLOCK_TOLERANCE,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    throw new Response("invalid access token", { status: 403 });
  }
}

function getJwks(url: string) {
  if (!jwksCache.has(url)) {
    jwksCache.set(url, createRemoteJWKSet(new URL(url)));
  }
  return jwksCache.get(url)!;
}

function deriveIssuer(jwksUrl: string): string {
  const parsed = new URL(jwksUrl);
  return parsed.origin;
}

function toResponse(error: unknown): Response {
  if (error instanceof Response) {
    return error;
  }
  return new Response("unauthorized", { status: 401 });
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const nodeBuffer = (globalThis as unknown as { Buffer?: { from(data: string, enc: string): Uint8Array } }).Buffer;
  if (nodeBuffer) {
    return nodeBuffer.from(value, "base64");
  }
  throw new Error("Base64 decoding not supported in this environment");
}
