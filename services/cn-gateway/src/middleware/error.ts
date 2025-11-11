import type { FastifyInstance } from "fastify";
import { logger } from "../logging.js";
import { SanitizationError } from "../modea/sanitize.js";
import { RateLimitError } from "./ratelimit.js";
import { ReplayError } from "../db/replay.js";
import { DeviceSignatureError } from "../ingest/routes.js";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, request, reply) => {
    const safeDetails = {
      url: request.routerPath,
      method: request.method,
      code: (err as { code?: string }).code,
      message: err.message
    };
    logger.error({ err, ...safeDetails }, "request_failed");

    if (err instanceof SanitizationError) {
      reply
        .status(422)
        .type("application/problem+json")
        .send({ error: "sanitization_failed", detail: err.message });
      return;
    }

    if (err instanceof RateLimitError) {
      reply.status(429).type("application/problem+json").send({ error: "rate_limited" });
      return;
    }

    if (err instanceof DeviceSignatureError) {
      reply.status(401).type("application/problem+json").send({ error: err.message });
      return;
    }

    if (err instanceof ReplayError) {
      const status = err.message === "timestamp_out_of_window" ? 422 : 409;
      reply.status(status).type("application/problem+json").send({ error: err.message });
      return;
    }

    if ((err as { validation?: unknown }).validation) {
      reply
        .status(422)
        .type("application/problem+json")
        .send({ error: "validation_failed" });
      return;
    }

    reply.status(500).type("application/problem+json").send({ error: "internal_error" });
  });
}
