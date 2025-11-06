import type { Env } from "../env";

const BUCKETS = new Map<string, Bucket>();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

interface Bucket {
  capacity: number;
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

export function checkIpRateLimit(req: Request, env: Env, route: string): IpRateLimitResult | null {
  const config = resolveConfig(env);
  if (!config) return null;
  const ip = extractClientIp(req);
  if (!ip) return null;

  const key = `${route}:${ip}`;
  const now = Date.now();
  cleanupBuckets(now);

  let bucket = BUCKETS.get(key);
  if (!bucket) {
    bucket = {
      capacity: config.capacity,
      tokens: config.capacity,
      lastRefill: now,
      blockedUntil: 0,
    };
    BUCKETS.set(key, bucket);
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
  bucket.capacity = config.capacity;

  return {
    limited: true,
    retryAfterSeconds: Math.ceil(config.blockDurationMs / 1000),
    remaining: 0,
    limit: config.capacity,
    ip,
  };
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

function refill(bucket: Bucket, config: IpRateLimitConfig, now: number) {
  bucket.capacity = config.capacity;
  if (bucket.tokens >= bucket.capacity) {
    bucket.tokens = bucket.capacity;
    bucket.lastRefill = now;
    return;
  }

  const elapsed = now - bucket.lastRefill;
  if (elapsed <= 0) return;

  const tokensToAdd = (elapsed / config.refillIntervalMs) * config.capacity;
  bucket.tokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

function cleanupBuckets(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of BUCKETS) {
    if (bucket.tokens >= bucket.capacity && bucket.blockedUntil <= now) {
      BUCKETS.delete(key);
    }
  }
}

export function __resetIpRateLimiterForTests() {
  BUCKETS.clear();
  lastCleanup = Date.now();
}
