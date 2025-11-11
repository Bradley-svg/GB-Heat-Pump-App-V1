import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import Redis from "ioredis";
import { config } from "./config.js";
import { logger } from "./logging.js";
import { idempotencyPlugin } from "./middleware/idempotency.js";
import { RateLimiter } from "./middleware/ratelimit.js";
import { ReplayDefense } from "./db/replay.js";
import { registerErrorHandler } from "./middleware/error.js";
import { ingestRoutes } from "./ingest/routes.js";
import { BatchExporter } from "./ingest/exporter.js";

export async function buildServer() {
  const app = Fastify({
    logger,
    trustProxy: true
  });

  let redis: Redis | undefined;
  if (config.REDIS_URL) {
    redis = new Redis(config.REDIS_URL, {
      lazyConnect: true,
      tls: config.REDIS_URL.startsWith("rediss://") ? {} : undefined
    });
    redis.on("error", (err) => logger.warn({ err }, "Redis error"));
    await redis.connect();
  }

  const replay = new ReplayDefense({
    skewSeconds: config.TIMESTAMP_SKEW_SECS,
    redis
  });
  const rateLimiter = new RateLimiter(config.RATE_LIMIT_RPM_DEVICE, redis);
  const exporter = new BatchExporter();

  await app.register(idempotencyPlugin, {
    redis,
    ttlSeconds: config.IDEMPOTENCY_TTL_HOURS * 3600
  });
  await app.register(ingestRoutes, {
    replay,
    rateLimiter,
    exporter
  });

  if (redis) {
    app.addHook("onClose", async () => {
      await redis.disconnect();
    });
  }

  registerErrorHandler(app);
  return app;
}

async function start() {
  const app = await buildServer();
  const address = await app.listen({ port: config.PORT, host: "0.0.0.0" });
  logger.info({ address }, "cn-gateway listening");

  const shutdown = async () => {
    logger.info("shutdown requested");
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const mainModuleUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;
if (import.meta.url === mainModuleUrl) {
  start().catch((err) => {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  });
}
