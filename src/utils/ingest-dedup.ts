import type { Env } from "../env";

export const DEFAULT_INGEST_DEDUP_WINDOW_MINUTES = 5;

export function ingestDedupWindowMs(env: Pick<Env, "INGEST_DEDUP_WINDOW_MINUTES">): number {
  const raw = env.INGEST_DEDUP_WINDOW_MINUTES;
  const parsed = raw ? Number(raw) : NaN;
  const minutes =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INGEST_DEDUP_WINDOW_MINUTES;
  const windowMs = Math.floor(minutes * 60_000);
  return Math.max(windowMs, 1_000);
}
