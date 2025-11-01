import type { Env } from "../env";
import { systemLogger } from "../utils/logging";

const DAY_MS = 86_400_000;
export const OPS_METRICS_WINDOW_DAYS = 30;
export const OPS_METRICS_WINDOW_MS = OPS_METRICS_WINDOW_DAYS * DAY_MS;
const OPS_METRICS_PRUNE_INTERVAL_MS = 15 * 60 * 1000;

let lastPruneAttemptMs = 0;

export function opsMetricsWindowStart(now = Date.now()): string {
  const startMs = now - OPS_METRICS_WINDOW_MS;
  return new Date(startMs).toISOString();
}

export async function pruneOpsMetrics(env: Env, now = Date.now()): Promise<void> {
  if (now - lastPruneAttemptMs < OPS_METRICS_PRUNE_INTERVAL_MS) {
    return;
  }
  lastPruneAttemptMs = now;
  const cutoff = opsMetricsWindowStart(now);
  try {
    await env.DB.prepare("DELETE FROM ops_metrics WHERE ts < ?1").bind(cutoff).run();
  } catch (error) {
    systemLogger({ scope: "ops_metrics" }).warn("ops_metrics.prune_failed", { cutoff, error });
  }
}
