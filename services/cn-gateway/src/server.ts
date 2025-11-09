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
    const payload = ingestPayloadSchema.parse(request.body);
    // In a real implementation we would enqueue for pseudonymization + storage
    request.log.info({ deviceId: payload.deviceId, seq: payload.seq }, "ingest accepted");
    reply.code(202).send({ status: "queued" });
  });

  app.post<{ Body: { batchId: string; records: PseudonymizedRecord[] } }>("/export", async (request, reply) => {
    const schema = z.object({
      batchId: z.string(),
      records: z.array(pseudonymizedRecordSchema),
    });
    const body = schema.parse(request.body);
    request.log.info({ batchId: body.batchId, count: body.records.length }, "export received");
    reply.send({ status: "ok", accepted: body.records.length });
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
