import type { Env } from "../env";
import { systemLogger } from "../utils/logging";

const MEMORY_BUCKETS = new Map<string, MemoryBucket>();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

interface MemoryBucket {
  capacity: number;
  tokens: number;
  lastRefill: number;
  blockedUntil: number;
}

interface StoredBucket {
  tokens: number;
  lastRefill: number;
  blockedUntil: number;
}

export interface IpRateLimitConfig {
  capacity: number;
  refillIntervalMs: number;
  blockDurationMs: number;
}

export interface IpRateLimitResult {
  limited: boolean;
  retryAfterSeconds?: number;
  remaining?: number;
  limit?: number;
  ip?: string;
}

let lastCleanup = Date.now();

export async function checkIpRateLimit(
  req: Request,
  env: Env,
  route: string,
): Promise<IpRateLimitResult | null> {
  const config = resolveConfig(env);
  if (!config) return null;
  const ip = extractClientIp(req);
  if (!ip) return null;

  const key = `${route}:${ip}`;
  const now = Date.now();

  if (env.INGEST_IP_BUCKETS) {
    try {
      const kvResult = await checkKvRateLimit(env.INGEST_IP_BUCKETS, key, ip, config, now);
      if (kvResult) {
        return kvResult;
      }
    } catch (error) {
      systemLogger({ scope: "ingest_ip_rate_limit" }).warn("ingest.ip_kv_bucket_failed", {
        error,
      });
    }
  }

  cleanupBuckets(now);
  return checkMemoryRateLimit(key, ip, config, now);
}

function resolveConfig(env: Env): IpRateLimitConfig | null {
  const rawLimit =
    typeof env.INGEST_IP_LIMIT_PER_MIN === "string"
      ? env.INGEST_IP_LIMIT_PER_MIN.trim()
      : "";
  if (!rawLimit) return null;
  const capacity = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(capacity) || capacity <= 0) return null;

  const rawBlockSeconds =
    typeof env.INGEST_IP_BLOCK_SECONDS === "string"
      ? env.INGEST_IP_BLOCK_SECONDS.trim()
      : "";
  const blockSeconds = Number.parseInt(rawBlockSeconds || "60", 10);
  const blockDurationMs =
    Number.isFinite(blockSeconds) && blockSeconds > 0 ? blockSeconds * 1000 : 60_000;

  return {
    capacity,
    refillIntervalMs: 60_000,
    blockDurationMs,
  };
}

function extractClientIp(req: Request): string | null {
  const direct = req.headers.get("cf-connecting-ip");
  if (direct?.trim()) {
    return direct.trim();
  }
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded?.trim()) {
    const first = forwarded.split(",")[0]?.trim();
    return first || null;
  }
  return null;
}

function refill(bucket: MemoryBucket | StoredBucket, config: IpRateLimitConfig, now: number) {
  if (bucket.tokens >= config.capacity) {
    bucket.tokens = config.capacity;
    bucket.lastRefill = now;
    return;
  }

  const elapsed = now - bucket.lastRefill;
  if (elapsed <= 0) return;

  const tokensToAdd = (elapsed / config.refillIntervalMs) * config.capacity;
  bucket.tokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

export function __resetIpRateLimiterForTests() {
  MEMORY_BUCKETS.clear();
  lastCleanup = Date.now();
}

async function checkKvRateLimit(
  kv: Env["INGEST_IP_BUCKETS"],
  key: string,
  ip: string,
  config: IpRateLimitConfig,
  now: number,
): Promise<IpRateLimitResult | null> {
  if (!kv) return null;
  const ttlSeconds = computeTtlSeconds(config);
  const stored = (await kv.get(key, { type: "json" })) as StoredBucket | null;
  const bucket: StoredBucket =
    stored ?? {
      tokens: config.capacity,
      lastRefill: now,
      blockedUntil: 0,
    };

  if (bucket.blockedUntil > now) {
    await kv.put(
      key,
      JSON.stringify(bucket),
      { expirationTtl: ttlSeconds },
    );
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
      remaining: 0,
      limit: config.capacity,
      ip,
    };
  }

  refill(bucket, config, now);

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    await kv.put(
      key,
      JSON.stringify(bucket),
      { expirationTtl: ttlSeconds },
    );
    return {
      limited: false,
      remaining: Math.floor(bucket.tokens),
      limit: config.capacity,
      ip,
    };
  }

  bucket.tokens = 0;
  bucket.blockedUntil = now + config.blockDurationMs;
  await kv.put(
    key,
    JSON.stringify(bucket),
    { expirationTtl: ttlSeconds },
  );

  return {
    limited: true,
    retryAfterSeconds: Math.ceil(config.blockDurationMs / 1000),
    remaining: 0,
    limit: config.capacity,
    ip,
  };
}

function checkMemoryRateLimit(
  key: string,
  ip: string,
  config: IpRateLimitConfig,
  now: number,
): IpRateLimitResult {
  let bucket = MEMORY_BUCKETS.get(key);
  if (!bucket) {
    bucket = {
      capacity: config.capacity,
      tokens: config.capacity,
      lastRefill: now,
      blockedUntil: 0,
    };
    MEMORY_BUCKETS.set(key, bucket);
  }

  if (bucket.blockedUntil > now) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
      remaining: 0,
      limit: config.capacity,
      ip,
    };
  }

  refill(bucket, config, now);

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;

    return {
      limited: false,
      remaining: Math.floor(bucket.tokens),
      limit: config.capacity,
      ip,
    };
  }

  bucket.blockedUntil = now + config.blockDurationMs;
  bucket.tokens = 0;

  return {
    limited: true,
    retryAfterSeconds: Math.ceil(config.blockDurationMs / 1000),
    remaining: 0,
    limit: config.capacity,
    ip,
  };
}

function computeTtlSeconds(config: IpRateLimitConfig): number {
  const totalMs = config.blockDurationMs + config.refillIntervalMs * 2;
  return Math.max(60, Math.ceil(totalMs / 1000));
}

function cleanupBuckets(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of MEMORY_BUCKETS) {
    if (bucket.tokens >= bucket.capacity && bucket.blockedUntil <= now) {
      MEMORY_BUCKETS.delete(key);
    }
  }
}
