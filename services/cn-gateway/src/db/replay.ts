import type { Redis } from "ioredis";
import { SanitizationError } from "../modea/sanitize.js";

export class ReplayError extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = "ReplayError";
  }
}

interface ReplayEntry {
  seqs: number[];
  lastTimestamp: number;
}

export class ReplayDefense {
  private readonly cache = new Map<string, ReplayEntry>();
  private readonly skewMs: number;
  private readonly redis?: Redis;
  private readonly ringSize = 5;

  constructor(options: { skewSeconds: number; redis?: Redis }) {
    this.skewMs = options.skewSeconds * 1000;
    this.redis = options.redis;
  }

  private withinWindow(timestampMs: number) {
    const now = Date.now();
    return Math.abs(now - timestampMs) <= this.skewMs;
  }

  private async load(deviceId: string): Promise<ReplayEntry> {
    if (this.redis) {
      const payload = await this.redis.get(this.redisKey(deviceId));
      if (payload) {
        return JSON.parse(payload) as ReplayEntry;
      }
    } else if (this.cache.has(deviceId)) {
      return this.cache.get(deviceId)!;
    }
    return { seqs: [], lastTimestamp: 0 };
  }

  private async persist(deviceId: string, entry: ReplayEntry): Promise<void> {
    if (this.redis) {
      await this.redis.set(this.redisKey(deviceId), JSON.stringify(entry), "EX", 600);
    } else {
      this.cache.set(deviceId, entry);
    }
  }

  private redisKey(deviceId: string) {
    return `cn:replay:${deviceId}`;
  }

  async assertFresh(deviceId: string, seq: number, timestampIso: string): Promise<void> {
    const timestampMs = Date.parse(timestampIso);
    if (Number.isNaN(timestampMs)) {
      throw new ReplayError("invalid_timestamp");
    }
    if (!this.withinWindow(timestampMs)) {
      throw new SanitizationError("timestamp_out_of_window");
    }

    const entry = await this.load(deviceId);
    if (entry.seqs.includes(seq)) {
      throw new ReplayError("seq_replay_detected");
    }

    entry.seqs = [...entry.seqs.slice(-(this.ringSize - 1)), seq];
    entry.lastTimestamp = timestampMs;

    await this.persist(deviceId, entry);
  }
}
