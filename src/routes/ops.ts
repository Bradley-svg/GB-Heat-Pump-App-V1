import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { buildDeviceLookup, presentDeviceId, userIsAdmin } from "../lib/device";
import { json } from "../utils/responses";
import { loggerForRequest } from "../utils/logging";
import { formatMetricsJson } from "../telemetry";
import { OpsOverviewQuerySchema } from "../schemas/ops";
import { validationErrorResponse } from "../utils/validation";
import {
  OPS_METRICS_WINDOW_DAYS,
  opsMetricsWindowStart,
  pruneOpsMetrics,
} from "../lib/ops-metrics";

export async function handleOpsOverview(req: Request, env: Env) {
  const log = loggerForRequest(req, { route: "/api/ops/overview" });
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!userIsAdmin(user)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const paramsResult = OpsOverviewQuerySchema.safeParse({
    limit: url.searchParams.get("limit"),
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { limit } = paramsResult.data;

  const now = Date.now();
  const windowStart = opsMetricsWindowStart(now);
  await pruneOpsMetrics(env, now);

  const deviceStats =
    (await env.DB.prepare("SELECT COUNT(*) AS total, SUM(online) AS online FROM devices").first<{
      total: number | null;
      online: number | null;
    }>()) ?? null;

  const opsRows =
    (
      await env.DB.prepare(
        `SELECT route,
                status_code,
                COUNT(*) AS count,
                SUM(duration_ms) AS total_duration_ms,
                AVG(duration_ms) AS avg_duration_ms,
                MAX(duration_ms) AS max_duration_ms
           FROM ops_metrics
          WHERE ts >= ?1
          GROUP BY route, status_code
          ORDER BY route ASC, status_code ASC`,
      )
        .bind(windowStart)
        .all<{
          route: string | null;
          status_code: number | null;
          count: number | null;
          total_duration_ms: number | string | null;
          avg_duration_ms: number | string | null;
          max_duration_ms: number | string | null;
        }>()
    ).results ?? [];

  const metrics = formatMetricsJson(deviceStats ?? { total: 0, online: 0 }, opsRows);

  const recentRows =
    (
      await env.DB.prepare(
        `SELECT ts, route, status_code, duration_ms, device_id
           FROM ops_metrics
          WHERE ts >= ?1
          ORDER BY ts DESC
          LIMIT ?2`,
      )
        .bind(windowStart, limit)
        .all<{
          ts: string;
          route: string;
          status_code: number;
          duration_ms: number;
          device_id: string | null;
        }>()
    ).results ?? [];

  const recent = [] as Array<{
    ts: string;
    route: string;
    status_code: number;
    duration_ms: number;
    device_id: string | null;
    lookup: string | null;
  }>;

  for (const row of recentRows) {
    let lookup: string | null = null;
    let outwardId: string | null = null;
    if (row.device_id) {
      outwardId = presentDeviceId(row.device_id, true);
      try {
        lookup = await buildDeviceLookup(row.device_id, env, true);
      } catch (error) {
        log.error("ops.recent_lookup_failed", { device_id: row.device_id, error });
        continue;
      }
    }
    recent.push({
      ts: row.ts,
      route: row.route,
      status_code: row.status_code,
      duration_ms: row.duration_ms,
      device_id: outwardId,
      lookup,
    });
  }

  return json({
    generated_at: metrics.generated_at,
    scope: "admin" as const,
    devices: metrics.devices,
   ops: metrics.ops,
   ops_summary: metrics.ops_summary,
   thresholds: metrics.thresholds?.ops ?? null,
    ops_window: {
      start: windowStart,
      days: OPS_METRICS_WINDOW_DAYS,
    },
    recent,
  });
}
