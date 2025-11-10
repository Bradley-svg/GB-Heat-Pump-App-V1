import { Router } from "itty-router";
import { pseudonymizedRecordSchema } from "@greenbro/sdk-core";
import { z } from "zod";
import { verify } from "@noble/ed25519";

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

export interface Env {
  EXPORT_VERIFY_PUBKEY?: string;
}

export async function verifyBatchSignature(payload: unknown, signatureHeader: string, env: Env) {
  if (!signatureHeader) {
    throw new Response("missing batch signature", { status: 401 });
  }
  const verifyKey = env.EXPORT_VERIFY_PUBKEY;
  if (!verifyKey) {
    throw new Response("signing key not configured", { status: 500 });
  }
  const message = encoder.encode(JSON.stringify(payload));
  const isValid = await verify(base64ToBytes(signatureHeader), message, base64ToBytes(verifyKey));
  if (!isValid) {
    throw new Response("invalid signature", { status: 403 });
  }
}

router.get("/health", () => new Response(JSON.stringify({ status: "ok" }), { headers: { "Content-Type": "application/json" } }));

router.post("/api/ingest/:profileId", async (request, env: Env) => {
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

router.post("/api/heartbeat/:profileId", async (request) => {
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
