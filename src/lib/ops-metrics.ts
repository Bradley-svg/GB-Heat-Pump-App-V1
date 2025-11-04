import type { Env } from "../env";
import { nowISO } from "../utils";
import type { Logger } from "../utils/logging";
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

export async function recordOpsMetric(
  env: Env,
  route: string,
  statusCode: number,
  durationMs: number,
  deviceId: string | null,
  logger?: Logger,
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
      .bind(nowISO(), route, statusCode, durationMs, deviceId)
      .run();
  } catch (error) {
    const bucketMs = Math.floor(Date.now() / 60_000) * 60_000;
    const scopedLogger = logger ?? systemLogger({ route });
    scopedLogger.error("ops_metrics.insert_failed", {
      route,
      status_code: statusCode,
      device_id: deviceId ?? undefined,
      duration_ms: durationMs,
      metric: "greenbro.ops_metrics.insert_failed",
      metric_key: "ops_metrics.insert_failed",
      count: 1,
      bucket_minute: new Date(bucketMs).toISOString(),
      error,
    });
  }
}
