import { Router } from "itty-router";
import { pseudonymizedRecordSchema } from "@greenbro/sdk-core";
import { z } from "zod";
import { verify } from "@noble/ed25519";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { D1Database } from "@cloudflare/workers-types";

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
  DB?: D1Database;
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

router.post("/api/ingest/:profileId", handleIngestRequest);

router.post("/api/heartbeat/:profileId", handleHeartbeatRequest);

router.all("*", () => new Response("not found", { status: 404 }));

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router.handle(request, env, ctx),
};

export async function handleIngestRequest(request: Request, env: Env) {
  try {
    await requireAccessJwt(request, env);
  } catch (error) {
    return toResponse(error);
  }
  const token = request.headers.get("Authorization");
  if (!token) {
    return new Response("missing token", { status: 401 });
  }
  const profileId = getProfileId(request);
  if (!profileId) {
    return new Response("missing profileId", { status: 400 });
  }
  if (!env.DB) {
    return new Response("storage unavailable", { status: 503 });
  }
  const body = await request.json();
  const payload = ingestSchema.parse(body);
  await verifyBatchSignature(payload, request.headers.get("X-Batch-Signature") ?? "", env);
  try {
    await persistBatch(env.DB, profileId, payload);
  } catch (error) {
    console.error("ingest.persist_failed", error);
    return new Response("unable to persist batch", { status: 500 });
  }
  return new Response(
    JSON.stringify({
      status: "queued",
      accepted: payload.records.length,
    }),
    { headers: { "Content-Type": "application/json" }, status: 202 },
  );
}

export async function handleHeartbeatRequest(request: Request, env: Env) {
  try {
    await requireAccessJwt(request, env);
  } catch (error) {
    return toResponse(error);
  }
  const profileId = getProfileId(request);
  if (!profileId) {
    return new Response("missing profileId", { status: 400 });
  }
  if (!env.DB) {
    return new Response("storage unavailable", { status: 503 });
  }
  const body = await request.json();
  const payload = heartbeatSchema.parse(body);
  try {
    await recordHeartbeat(env.DB, profileId, payload);
  } catch (error) {
    console.error("heartbeat.persist_failed", error);
    return new Response("unable to persist heartbeat", { status: 500 });
  }
  return new Response(JSON.stringify({ status: "ok", keyVersion: payload.keyVersion }), {
    headers: { "Content-Type": "application/json" },
  });
}

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

function getProfileId(request: Request): string | null {
  try {
    const pathname = new URL(request.url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const profileId = segments[2];
    return profileId && profileId.length ? profileId : null;
  } catch {
    return null;
  }
}

async function persistBatch(envDb: D1Database, profileId: string, payload: z.infer<typeof ingestSchema>) {
  const id = generateId();
  const receivedAt = new Date().toISOString();
  await envDb
    .prepare(
      `INSERT INTO ingest_batches (id, batch_id, profile_id, record_count, payload_json, received_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(id, payload.batchId, profileId, payload.records.length, JSON.stringify(payload.records), receivedAt)
    .run();
}

async function recordHeartbeat(envDb: D1Database, profileId: string, payload: z.infer<typeof heartbeatSchema>) {
  const id = generateId();
  const receivedAt = new Date().toISOString();
  await envDb
    .prepare(
      `INSERT INTO ingest_heartbeats (id, profile_id, key_version, heartbeat_ts, received_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(id, profileId, payload.keyVersion, payload.timestamp, receivedAt)
    .run();
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

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `batch-${Math.random().toString(36).slice(2)}`;
}
