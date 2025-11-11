import crypto from "node:crypto";
import type { Redis } from "ioredis";
import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";

interface CachedResponse {
  hash: string;
  statusCode: number;
  body: string;
  contentType?: string | number | string[];
}

interface IdempotencyStore {
  get(key: string): Promise<CachedResponse | null>;
  set(key: string, value: CachedResponse, ttlSeconds: number): Promise<void>;
}

class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly store = new Map<string, { expiresAt: number; value: CachedResponse }>();

  async get(key: string): Promise<CachedResponse | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: CachedResponse, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

class RedisIdempotencyStore implements IdempotencyStore {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<CachedResponse | null> {
    const data = await this.redis.get(this.redisKey(key));
    if (!data) {
      return null;
    }
    return JSON.parse(data) as CachedResponse;
  }

  async set(key: string, value: CachedResponse, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.redisKey(key), JSON.stringify(value), "EX", ttlSeconds);
  }

  private redisKey(key: string) {
    return `cn:idempo:${key}`;
  }
}

function bodyHash(payload: unknown): string {
  const normalized =
    typeof payload === "string" ? payload : JSON.stringify(payload ?? {}, (_key, value) => value ?? null);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

declare module "fastify" {
  interface FastifyRequest {
    idempotency?: {
      key: string;
      hash: string;
    };
  }
}

interface PluginOpts {
  redis?: Redis;
  ttlSeconds: number;
}

async function preHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  store: IdempotencyStore,
  ttlSeconds: number
) {
  const header = request.headers["idempotency-key"];
  if (!header || typeof header !== "string") {
    return;
  }

  const hashed = bodyHash(request.body);
  const cached = await store.get(header);
  if (cached) {
    if (cached.hash !== hashed) {
      reply.code(409).send({ error: "idempotency_conflict" });
      return;
    }
    if (cached.contentType) {
      reply.header("content-type", cached.contentType);
    }
    reply.header("x-idempotent-replay", "true");
    reply.code(cached.statusCode).send(cached.body);
    return reply;
  }
  request.idempotency = { key: header, hash: hashed };
  reply.header("x-idempotency-ttl", String(ttlSeconds));
}

export const idempotencyPlugin = fp<PluginOpts>(async (fastify, opts) => {
  const store = opts.redis ? new RedisIdempotencyStore(opts.redis) : new MemoryIdempotencyStore();
  fastify.addHook("preHandler", async (request, reply) => preHandler(request, reply, store, opts.ttlSeconds));

  fastify.addHook("onSend", async (request, reply, payload) => {
    if (!request.idempotency) {
      return;
    }
    if (reply.statusCode >= 500) {
      return;
    }

    const body =
      typeof payload === "string"
        ? payload
        : Buffer.isBuffer(payload)
          ? payload.toString("utf8")
          : JSON.stringify(payload);

    await store.set(
      request.idempotency.key,
      {
        hash: request.idempotency.hash,
        statusCode: reply.statusCode,
        body,
        contentType: reply.getHeader("content-type") ?? "application/json"
      },
      opts.ttlSeconds
    );
  });
});
