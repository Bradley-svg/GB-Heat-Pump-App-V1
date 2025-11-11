import type { Redis } from "ioredis";

export class RateLimitError extends Error {
  statusCode = 429;
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

interface MemoryBucket {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private readonly limitPerMinute: number;
  private readonly redis?: Redis;
  private readonly memory = new Map<string, MemoryBucket>();

  constructor(limitPerMinute: number, redis?: Redis) {
    this.limitPerMinute = limitPerMinute;
    this.redis = redis;
  }

  async consume(deviceId: string): Promise<void> {
    if (this.redis) {
      await this.consumeRedis(deviceId);
    } else {
      this.consumeMemory(deviceId);
    }
  }

  private async consumeRedis(deviceId: string) {
    const key = `cn:rl:${deviceId}`;
    const count = await this.redis!.incr(key);
    if (count === 1) {
      await this.redis!.expire(key, 60);
    }
    if (count > this.limitPerMinute) {
      throw new RateLimitError("rate_limited");
    }
  }

  private consumeMemory(deviceId: string) {
    const nowWindow = Math.floor(Date.now() / 60_000);
    const bucket = this.memory.get(deviceId);
    if (!bucket || bucket.windowStart !== nowWindow) {
      this.memory.set(deviceId, { count: 1, windowStart: nowWindow });
      return;
    }
    bucket.count += 1;
    if (bucket.count > this.limitPerMinute) {
      throw new RateLimitError("rate_limited");
    }
  }
}
