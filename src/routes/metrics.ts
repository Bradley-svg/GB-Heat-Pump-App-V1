import type { Env } from "../env";
import { requireAccessUser, userIsAdmin } from "../lib/access";
import { json, text } from "../utils/responses";
import { validationErrorResponse } from "../utils/validation";
import { MetricsQuerySchema } from "../schemas/metrics";
import { formatMetricsJson, formatPromMetrics, pickMetricsFormat } from "../telemetry";
import {
  OPS_METRICS_WINDOW_DAYS,
  opsMetricsWindowStart,
  pruneOpsMetrics,
} from "../lib/ops-metrics";
import { loadSignupFunnelSummary } from "../lib/signup-funnel";

export async function handleMetrics(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!userIsAdmin(user)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const paramsResult = MetricsQuerySchema.safeParse({
    format: url.searchParams.get("format"),
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const formatParam = paramsResult.data.format;
  const isDashboardFormat = (formatParam as string | undefined) === "dashboard";

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

  const deviceSummary = {
    total: deviceStats?.total ?? null,
    online: deviceStats?.online ?? null,
  };

  const signupSummary = await loadSignupFunnelSummary(env, { now: new Date(now) });
  const metricsPayload = formatMetricsJson(
    deviceSummary,
    opsRows,
    signupSummary,
    new Date(now).toISOString(),
  );

  if (isDashboardFormat) {
    const dashboard = buildDashboardPayload(metricsPayload);
    return json({
      ...dashboard,
      ops_window: {
        start: windowStart,
        days: OPS_METRICS_WINDOW_DAYS,
      },
    });
  }

  const format = pickMetricsFormat(formatParam, req.headers.get("accept") ?? "");

  if (format === "json") {
    return json({
      ...metricsPayload,
      ops_window: {
        start: windowStart,
        days: OPS_METRICS_WINDOW_DAYS,
      },
    });
  }

  const promPayload = formatPromMetrics(deviceSummary, opsRows, signupSummary);
  return text(promPayload, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

type MetricsJsonPayload = ReturnType<typeof formatMetricsJson>;
type SeverityLevel = "ok" | "warn" | "critical";

function buildDashboardPayload(payload: MetricsJsonPayload) {
  const offlineStatus = deriveSeverity(
    payload.devices.offline_ratio,
    payload.thresholds.devices.offline_ratio,
  );

  const serverSeverity = deriveSeverity(
    payload.ops_summary.server_error_rate,
    payload.thresholds.ops.error_rate,
  );
  const clientSeverity = deriveSeverity(
    payload.ops_summary.client_error_rate,
    payload.thresholds.ops.client_error_rate,
  );
  const maxAvgDuration = payload.ops_summary.slow_routes[0]?.avg_duration_ms ?? 0;
  const latencySeverity = deriveSeverity(
    maxAvgDuration,
    payload.thresholds.ops.avg_duration_ms,
  );

  const overallOpsSeverity = [serverSeverity, clientSeverity, latencySeverity].reduce(
    (acc, current) => (severityWeight(current) > severityWeight(acc) ? current : acc),
    "ok" as SeverityLevel,
  );

  const signupMetrics = payload.signup;
  const signupThresholds = payload.thresholds.signup;
  const signupConversionSeverity = deriveInvertedSeverity(
    signupMetrics.conversion_rate,
    signupThresholds.conversion_rate,
  );
  const signupPendingSeverity = deriveSeverity(
    signupMetrics.pending_ratio,
    signupThresholds.pending_ratio,
  );
  const signupErrorSeverity = deriveSeverity(
    signupMetrics.error_rate,
    signupThresholds.error_rate,
  );
  const overallSignupSeverity = [signupConversionSeverity, signupPendingSeverity, signupErrorSeverity].reduce(
    (acc, level) => (severityWeight(level) > severityWeight(acc) ? level : acc),
    signupMetrics.status,
  );

  return {
    generated_at: payload.generated_at,
    devices: {
      ...payload.devices,
      status: offlineStatus,
      thresholds: payload.thresholds.devices,
    },
    ops: {
      summary: payload.ops_summary,
      status: overallOpsSeverity,
      metrics: {
        server_error_rate: {
          value: payload.ops_summary.server_error_rate,
          status: serverSeverity,
          thresholds: payload.thresholds.ops.error_rate,
        },
        client_error_rate: {
          value: payload.ops_summary.client_error_rate,
          status: clientSeverity,
          thresholds: payload.thresholds.ops.client_error_rate,
        },
        max_avg_duration_ms: {
          value: maxAvgDuration,
          status: latencySeverity,
          thresholds: payload.thresholds.ops.avg_duration_ms,
        },
      },
      slow_routes: payload.ops_summary.slow_routes,
      top_server_error_routes: payload.ops_summary.top_server_error_routes,
    },
    thresholds: payload.thresholds,
    signup: {
      ...signupMetrics,
      status: overallSignupSeverity,
      metrics: {
        conversion_rate: {
          value: signupMetrics.conversion_rate,
          status: signupConversionSeverity,
          thresholds: signupThresholds.conversion_rate,
        },
        pending_ratio: {
          value: signupMetrics.pending_ratio,
          status: signupPendingSeverity,
          thresholds: signupThresholds.pending_ratio,
        },
        error_rate: {
          value: signupMetrics.error_rate,
          status: signupErrorSeverity,
          thresholds: signupThresholds.error_rate,
        },
      },
    },
  };
}

function deriveSeverity(
  value: number,
  thresholds: { warn: number; critical: number },
): SeverityLevel {
  if (value >= thresholds.critical) return "critical";
  if (value >= thresholds.warn) return "warn";
  return "ok";
}

function severityWeight(level: SeverityLevel): number {
  switch (level) {
    case "critical":
      return 3;
    case "warn":
      return 2;
    default:
      return 1;
  }
}

function deriveInvertedSeverity(
  value: number,
  thresholds: { warn: number; critical: number },
): SeverityLevel {
  if (value <= thresholds.critical) return "critical";
  if (value <= thresholds.warn) return "warn";
  return "ok";
}
