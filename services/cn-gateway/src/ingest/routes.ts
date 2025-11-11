import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { totp } from "otplib";
import { config } from "../config.js";
import { logger } from "../logging.js";
import { ingestLatency, ingestRequests, metricsResponse } from "../metrics.js";
import { sanitizeTelemetry, SanitizationError } from "../modea/sanitize.js";
import { pseudonymizeDeviceId } from "../crypto/pseudo.js";
import type { TelemetryPayload } from "../validators/common.js";
import { validateTelemetry } from "../validators/common.js";
import { persistMapping } from "../db/mapping.js";
import { recordAuditLog, recordErrorEvent } from "../db/audit.js";
import { ReplayDefense } from "../db/replay.js";
import { RateLimiter, RateLimitError } from "../middleware/ratelimit.js";
import { BatchExporter } from "./exporter.js";
import { serviceVersion } from "../version.js";
import { publicKeyFromPrivate, verifyBatchSignature } from "../crypto/ed25519.js";
import { getKmsAdapter, resetKmsAdapter } from "../kms/index.js";

export class DeviceSignatureError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = "DeviceSignatureError";
  }
}

async function verifyDeviceSignature(body: unknown, signatureHeader?: string) {
  if (!signatureHeader || !signatureHeader.trim()) {
    throw new DeviceSignatureError("device_signature_missing");
  }
  const adapter = getKmsAdapter();
  const digest = await adapter.signHmacSHA256(Buffer.from(JSON.stringify(body ?? {})));
  const expected = digest
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
  const provided = signatureHeader.trim();
  const matches =
    expected.length === provided.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  if (!matches) {
    throw new DeviceSignatureError("device_signature_invalid");
  }
}

async function handleMetrics(reply: FastifyReply) {
  if (!config.METRICS_ENABLED) {
    reply.status(503).send("metrics_disabled");
    return;
  }
  const body = await metricsResponse();
  reply.header("content-type", "text/plain").send(body);
}

interface RoutesOptions {
  replay: ReplayDefense;
  rateLimiter: RateLimiter;
  exporter: BatchExporter;
}

async function ingestHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  opts: RoutesOptions
) {
  const start = process.hrtime.bigint();
  let outcome: "success" | "failure" = "success";
  try {
    await verifyDeviceSignature(request.body, request.headers["x-device-signature"] as string | undefined);

    if (!validateTelemetry(request.body)) {
      const err = new Error("validation_failed");
      (err as Record<string, unknown>).validation = validateTelemetry.errors;
      throw err;
    }

    const telemetry = request.body as TelemetryPayload;
    const sanitized = sanitizeTelemetry(telemetry);
    const { didPseudo, keyVersion } = await pseudonymizeDeviceId(sanitized.deviceId);

    await opts.rateLimiter.consume(didPseudo);
    await opts.replay.assertFresh(didPseudo, sanitized.seq, sanitized.timestamp);

    const mapping = await persistMapping(sanitized.deviceId, didPseudo, keyVersion);
    opts.exporter.enqueue({
      didPseudo: mapping.did_pseudo,
      seq: sanitized.seq,
      timestamp: sanitized.timestamp,
      metrics: sanitized.metrics,
      keyVersion
    });

    reply.code(202).send({
      status: "queued",
      didPseudo: mapping.did_pseudo,
      keyVersion
    });
  } catch (err) {
    outcome = "failure";
    if (err instanceof SanitizationError || err instanceof RateLimitError) {
      await recordErrorEvent({
        deviceIdRaw: (request.body as TelemetryPayload | undefined)?.deviceId,
        seq: (request.body as TelemetryPayload | undefined)?.seq,
        errorCode: err.message
      });
      if (err instanceof SanitizationError) {
        await recordAuditLog("gateway", "ingest_reject", { reason: err.message }, request.ip);
      }
    }
    throw err;
  } finally {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    ingestLatency.observe({ outcome }, durationSeconds);
    ingestRequests.inc({ outcome });
  }
}

async function exportLoopback(request: FastifyRequest, reply: FastifyReply) {
  const signature = request.headers["x-batch-signature"];
  if (!signature || typeof signature !== "string") {
    reply.status(400).send({ error: "missing_signature" });
    return;
  }
  const buffer = Buffer.from(JSON.stringify(request.body ?? {}));
  const publicKey = await publicKeyFromPrivate(config.EXPORT_SIGNING_KEY_PATH);
  const valid = await verifyBatchSignature(buffer, signature, publicKey);
  if (!valid) {
    reply.status(400).send({ error: "invalid_signature" });
    return;
  }
  reply.status(202).send({ status: "accepted" });
}

async function rotateKeyHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!config.ADMIN_TOKEN || !config.ADMIN_TOTP_SECRET) {
    reply.status(503).send({ error: "rotation_disabled" });
    return;
  }
  const adminToken = request.headers["x-admin-token"];
  const totpHeader = request.headers["x-admin-totp"];
  if (adminToken !== config.ADMIN_TOKEN || typeof totpHeader !== "string") {
    reply.status(403).send({ error: "unauthorized" });
    return;
  }
  const tokenValid = totp.verify({ token: totpHeader, secret: config.ADMIN_TOTP_SECRET, window: 1 });
  if (!tokenValid) {
    reply.status(403).send({ error: "invalid_totp" });
    return;
  }
  const body = request.body as { keyVersion?: string } | undefined;
  if (!body?.keyVersion) {
    reply.status(400).send({ error: "missing_key_version" });
    return;
  }
  resetKmsAdapter(body.keyVersion);
  await recordAuditLog("admin", "rotate_key", { keyVersion: body.keyVersion }, request.ip);
  reply.send({ status: "scheduled", keyVersion: body.keyVersion });
}

async function registerRoutes(app: FastifyInstance, opts: RoutesOptions) {
  app.post("/ingest", async (request, reply) => ingestHandler(request, reply, opts));
  app.post("/export", exportLoopback);
  app.post("/admin/rotate-key", rotateKeyHandler);
  app.get("/health", async (_, reply) => {
    reply.send({
      status: "ok",
      version: serviceVersion,
      keyVersion: config.KMS_KEY_VERSION,
      exportEnabled: config.EXPORT_ENABLED
    });
  });
  app.get("/metrics", async (_request, reply) => handleMetrics(reply));
}

export const ingestRoutes = fp(registerRoutes);
