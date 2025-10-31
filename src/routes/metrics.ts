import type { Env } from "../env";
import { json, text } from "../utils/responses";
import { nowISO } from "../utils";

type MetricsFormat = "prom" | "json";

function pickFormat(req: Request): MetricsFormat {
  const url = new URL(req.url);
  const accept = req.headers.get("accept") ?? "";
  const format = url.searchParams.get("format");
  if (format === "json") return "json";
  if (format === "prom") return "prom";
  if (accept.includes("application/json")) return "json";
  return "prom";
}

export async function handleMetrics(req: Request, env: Env) {
  const format = pickFormat(req);

  const deviceStats =
    (await env.DB.prepare("SELECT COUNT(*) AS total, SUM(online) AS online FROM devices").first<{
      total: number | null;
      online: number | null;
    }>()) ?? null;

  const opsRows =
    (
      await env.DB.prepare(
        `SELECT route, status_code, COUNT(*) AS count
           FROM ops_metrics
          GROUP BY route, status_code
          ORDER BY route ASC, status_code ASC`,
      ).all<{
        route: string | null;
        status_code: number | null;
        count: number | null;
      }>()
    ).results ?? [];

  const devicesTotal = deviceStats?.total ?? 0;
  const devicesOnline = deviceStats?.online ?? 0;
  const devicesOffline = Math.max(0, devicesTotal - devicesOnline);

  if (format === "json") {
    return json({
      devices: {
        total: devicesTotal,
        online: devicesOnline,
        offline: devicesOffline,
      },
      ops: opsRows.map((row) => ({
        route: row.route ?? "unknown",
        status_code: row.status_code ?? 0,
        count: row.count ?? 0,
      })),
      generated_at: nowISO(),
    });
  }

  const lines: string[] = [
    "# HELP greenbro_devices_total Total registered devices",
    "# TYPE greenbro_devices_total gauge",
    `greenbro_devices_total ${devicesTotal}`,
    "# HELP greenbro_devices_online_total Devices currently marked online",
    "# TYPE greenbro_devices_online_total gauge",
    `greenbro_devices_online_total ${devicesOnline}`,
    "# HELP greenbro_devices_offline_total Devices currently marked offline",
    "# TYPE greenbro_devices_offline_total gauge",
    `greenbro_devices_offline_total ${devicesOffline}`,
    "# HELP greenbro_ops_requests_total Recorded API requests by route and status",
    "# TYPE greenbro_ops_requests_total counter",
  ];

  for (const row of opsRows) {
    const routeLabel = (row.route ?? "unknown").replace(/"/g, '\\"');
    const statusLabel = row.status_code ?? 0;
    const count = row.count ?? 0;
    lines.push(`greenbro_ops_requests_total{route="${routeLabel}",status="${statusLabel}"} ${count}`);
  }

  lines.push(`# HELP greenbro_metrics_generated_at Timestamp metrics payload produced`, "# TYPE greenbro_metrics_generated_at gauge");
  lines.push(`greenbro_metrics_generated_at ${Math.floor(Date.now() / 1000)}`);

  return text(lines.join("\n") + "\n", {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
