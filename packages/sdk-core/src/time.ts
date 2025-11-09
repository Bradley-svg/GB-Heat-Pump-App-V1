export function normalizeTimestamp(date: Date | string | number, roundToMinutes = 1): string {
  const ms = typeof date === "string" || typeof date === "number" ? new Date(date).getTime() : date.getTime();
  if (Number.isNaN(ms)) {
    throw new Error("Unable to normalize timestamp");
  }
  const roundMs = roundToMinutes * 60 * 1000;
  const normalized = Math.round(ms / roundMs) * roundMs;
  return new Date(normalized).toISOString();
}

export function isTimestampWithinTolerance(timestamp: string, toleranceMinutes = 2): boolean {
  const target = new Date(timestamp).getTime();
  if (Number.isNaN(target)) {
    return false;
  }
  const now = Date.now();
  const toleranceMs = toleranceMinutes * 60 * 1000;
  return Math.abs(now - target) <= toleranceMs;
}

export class SequenceWindow {
  #window: number[];
  constructor(private readonly size = 5) {
    this.#window = [];
  }

  register(seq: number): boolean {
    if (!Number.isInteger(seq) || seq < 0) {
      throw new Error("Sequence must be a non-negative integer");
    }
    if (this.#window.includes(seq)) {
      return false;
    }
    this.#window.unshift(seq);
    this.#window = this.#window.slice(0, this.size);
    return true;
  }
}
