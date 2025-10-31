import type { Env } from "../env";
import { json, text } from "../utils/responses";
import { validationErrorResponse } from "../utils/validation";
import { MetricsQuerySchema } from "../schemas/metrics";
import { formatMetricsJson, formatPromMetrics, pickMetricsFormat } from "../telemetry";

export async function handleMetrics(req: Request, env: Env) {
  const url = new URL(req.url);
  const paramsResult = MetricsQuerySchema.safeParse({
    format: url.searchParams.get("format"),
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const format = pickMetricsFormat(paramsResult.data.format, req.headers.get("accept") ?? "");

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
          GROUP BY route, status_code
          ORDER BY route ASC, status_code ASC`,
      ).all<{
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

  if (format === "json") {
    return json(formatMetricsJson(deviceSummary, opsRows));
  }

  const promPayload = formatPromMetrics(deviceSummary, opsRows);
  return text(promPayload, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
