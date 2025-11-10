import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import {
  ingestPayloadSchema,
  pseudonymizedRecordSchema,
  type IngestPayload,
  type PseudonymizedRecord,
  telemetryMetricsSchema,
} from "@greenbro/sdk-core";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { Counter, Registry } from "prom-client";
import { sign } from "@noble/ed25519";

const rotateKeySchema = z.object({
  newKeyVersion: z.string(),
  scheduledFor: z.string().datetime(),
  approvals: z.array(
    z.object({
      role: z.string(),
      signature: z.string(),
    }),
  ),
});

const heartbeatSchema = z.object({
  keyVersion: z.string(),
  timestamp: z.string().datetime(),
});

const SIGNING_KEY_PATH = process.env.EXPORT_SIGNING_KEY_PATH;
const BATCH_SIGNING_KEY = SIGNING_KEY_PATH ? readKeyMaterial(SIGNING_KEY_PATH) : undefined;
const IDEMPOTENCY_TTL_MS = Number(process.env.IDEMPOTENCY_TTL_MS ?? 86_400_000);
const TIMESTAMP_SKEW_MS = Number(process.env.INGEST_SKEW_MS ?? 120_000);
const seqWindows = new Map<string, number[]>();
const idempotencyCache = new Map<string, { statusCode: number; body: unknown; expiresAt: number }>();

const registry = new Registry();
registry.setDefaultLabels({
  component: "cn-gateway",
  region: process.env.REGION ?? "cn-north",
  profile: process.env.PROFILE ?? "default",
  key_version: process.env.KMS_KEY_VERSION ?? "v1",
});
const ingestCounter = new Counter({
  name: "ingest_requests_total",
  help: "Count of ingest requests",
  labelNames: ["status"],
  registers: [registry],
});
const piiRejectionCounter = new Counter({
  name: "pii_rejection_total",
  help: "Count of payloads rejected due to forbidden fields",
  labelNames: ["reason"],
  registers: [registry],
});

const forbiddenValuePatterns = [
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/, // IPv4
  /\b[0-9A-F]{2}(?:[:-][0-9A-F]{2}){5}\b/i, // MAC
  /\b\d{15}\b/, // IMEI
];

export interface ServerOptions {
  logger?: boolean;
}

export function buildServer(options: ServerOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? true });
  app.register(helmet);
  app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute",
  });

  app.addHook("preHandler", async (request, reply) => {
    if (request.method === "POST" && !request.body) {
      reply.code(400).send({ error: "JSON body required" });
    }
  });

  app.get("/health", async () => ({
    status: "ok",
    keyVersion: process.env.KMS_KEY_VERSION ?? "v1",
  }));

  app.post<{ Body: IngestPayload }>("/ingest", async (request, reply) => {
    const idempotencyKey = request.headers["idempotency-key"];
    if (!idempotencyKey) {
      ingestCounter.inc({ status: "missing_idempotency" });
      reply.code(400).send({ error: "Idempotency-Key header required" });
      return;
    }
    const payload = ingestPayloadSchema.parse(request.body);
    if (containsForbiddenPattern(payload)) {
      piiRejectionCounter.inc({ reason: "pattern" });
      reply.code(422).send({ error: "forbidden pattern detected" });
      return;
    }
    const now = Date.now();
    const timestampMs = Date.parse(payload.timestamp);
    if (Number.isNaN(timestampMs) || Math.abs(now - timestampMs) > TIMESTAMP_SKEW_MS) {
      ingestCounter.inc({ status: "skew" });
      reply.code(422).send({ error: "timestamp outside ±120s window" });
      return;
    }
    const seqKey = payload.deviceId;
    const window = seqWindows.get(seqKey) ?? [];
    if (window.includes(payload.seq)) {
      ingestCounter.inc({ status: "duplicate_seq" });
      reply.code(409).send({ error: "duplicate sequence" });
      return;
    }
    seqWindows.set(seqKey, [payload.seq, ...window].slice(0, 5));

    const cacheKey = `${seqKey}:${idempotencyKey}`;
    const cached = idempotencyCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      ingestCounter.inc({ status: "idempotent_hit" });
      reply.code(cached.statusCode).send(cached.body);
      return;
    }
    purgeExpiredEntries(idempotencyCache);
    // In a real implementation we would enqueue for pseudonymization + storage
    request.log.info({ deviceId: payload.deviceId, seq: payload.seq }, "ingest accepted");
    const response = { status: "queued" };
    idempotencyCache.set(cacheKey, { statusCode: 202, body: response, expiresAt: now + IDEMPOTENCY_TTL_MS });
    ingestCounter.inc({ status: "accepted" });
    reply.code(202).send(response);
  });

  app.post<{ Body: { batchId: string; records: PseudonymizedRecord[] } }>("/export", async (request, reply) => {
    const schema = z.object({
      batchId: z.string(),
      records: z.array(pseudonymizedRecordSchema),
    });
    const body = schema.parse(request.body);
    const minDevices = Number(process.env.EXPORT_MIN_DEVICES ?? 5);
    if (body.records.length < minDevices) {
      reply.code(422).send({ error: `insufficient devices for export (min ${minDevices})` });
      return;
    }
    request.log.info({ batchId: body.batchId, count: body.records.length }, "export received");
    const signature = BATCH_SIGNING_KEY ? await signBatch(body) : null;
    if (signature) {
      reply.header("X-Batch-Signature", signature);
    }
    reply.send({ status: "ok", accepted: body.records.length, signature });
  });

  app.post("/admin/rotate-key", async (request, reply) => {
    const body = rotateKeySchema.parse(request.body);
    request.log.info({ newKeyVersion: body.newKeyVersion }, "rotation scheduled");
    reply.code(202).send({ status: "scheduled", jobId: `rotate-${body.newKeyVersion}` });
  });

  app.post("/heartbeat", async (request, reply) => {
    const body = heartbeatSchema.parse(request.body);
    request.log.info(body, "heartbeat");
    reply.send({ status: "ok" });
  });

  app.post("/ingest/validate", async (request, reply) => {
    const payload = telemetryMetricsSchema.safeParse(request.body);
    if (!payload.success) {
      reply.code(422).send({ error: "invalid metrics", details: payload.error.flatten() });
      return;
    }
    reply.send({ status: "valid" });
  });

  app.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", registry.contentType);
    reply.send(await registry.metrics());
  });

  return app;
}

if (import.meta.filename === process.argv[1]) {
  const port = Number(process.env.PORT) || 8080;
  buildServer()
    .listen({ port, host: "0.0.0.0" })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

function readKeyMaterial(path: string): Uint8Array | undefined {
  try {
    const raw = readFileSync(path, "utf8").trim();
    if (!raw) return undefined;
    if (/^[0-9a-fA-F]+$/.test(raw)) {
      return Uint8Array.from(Buffer.from(raw, "hex"));
    }
    return Uint8Array.from(Buffer.from(raw, "base64"));
  } catch (error) {
    console.warn("[gateway] Unable to read signing key:", error);
    return undefined;
  }
}

async function signBatch(payload: unknown) {
  if (!BATCH_SIGNING_KEY) {
    throw new Error("EXPORT_SIGNING_KEY_PATH not configured");
  }
  const message = Buffer.from(JSON.stringify(payload));
  const sig = await sign(message, BATCH_SIGNING_KEY);
  return Buffer.from(sig).toString("base64");
}

function purgeExpiredEntries(map: Map<string, { expiresAt: number }>) {
  const now = Date.now();
  for (const [key, entry] of map.entries()) {
    if (entry.expiresAt <= now) {
      map.delete(key);
    }
  }
}

function containsForbiddenPattern(value: unknown): boolean {
  if (typeof value === "string") {
    return forbiddenValuePatterns.some((regex) => regex.test(value));
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenPattern(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => containsForbiddenPattern(item));
  }
  return false;
}
