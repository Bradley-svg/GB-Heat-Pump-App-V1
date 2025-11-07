import type { Env } from "../env";
import type { KvNamespace } from "../env";
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

export interface RateLimitOptions {
  limitEnvKey?: keyof Env;
  blockEnvKey?: keyof Env;
  kvBindingKey?: keyof Env;
  defaultLimit?: number;
  defaultBlockSeconds?: number;
}

export async function checkIpRateLimit(
  req: Request,
  env: Env,
  route: string,
  options?: RateLimitOptions,
): Promise<IpRateLimitResult | null> {
  const config = resolveConfig(env, options);
  if (!config) return null;
  const ip = extractClientIp(req);
  if (!ip) return null;

  const key = `${route}:${ip}`;
  const now = Date.now();
  const kvBinding = resolveKvBinding(env, options);

  if (kvBinding) {
    try {
      const kvResult = await checkKvRateLimit(kvBinding, key, ip, config, now);
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

function resolveConfig(env: Env, options?: RateLimitOptions): IpRateLimitConfig | null {
  const rawLimit = readStringEnv(
    env,
    options?.limitEnvKey,
    typeof env.INGEST_IP_LIMIT_PER_MIN === "string" ? env.INGEST_IP_LIMIT_PER_MIN : undefined,
  );
  let capacity: number | null = null;
  if (rawLimit) {
    const parsed = Number.parseInt(rawLimit.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      capacity = parsed;
    } else {
      return null;
    }
  } else if (options?.defaultLimit && options.defaultLimit > 0) {
    capacity = options.defaultLimit;
  }
  if (!capacity) {
    return null;
  }

  const rawBlockSeconds = readStringEnv(
    env,
    options?.blockEnvKey,
    typeof env.INGEST_IP_BLOCK_SECONDS === "string"
      ? env.INGEST_IP_BLOCK_SECONDS
      : undefined,
  );
  const fallbackBlockSeconds = options?.defaultBlockSeconds ?? 60;
  const blockSeconds = Number.parseInt(rawBlockSeconds || String(fallbackBlockSeconds), 10);
  const blockDurationMs =
    Number.isFinite(blockSeconds) && blockSeconds > 0
      ? blockSeconds * 1000
      : fallbackBlockSeconds * 1000;

  return {
    capacity,
    refillIntervalMs: 60_000,
    blockDurationMs,
  };
}

function readStringEnv(env: Env, key: keyof Env | undefined, fallback?: string): string {
  if (key) {
    const value = env[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return typeof fallback === "string" ? fallback : "";
}

function resolveKvBinding(env: Env, options?: RateLimitOptions): KvNamespace | undefined {
  if (options?.kvBindingKey) {
    const binding = env[options.kvBindingKey];
    if (binding && typeof (binding as KvNamespace).get === "function") {
      return binding as KvNamespace;
    }
  }
  return env.INGEST_IP_BUCKETS;
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
