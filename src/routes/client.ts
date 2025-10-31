import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { buildDeviceLookup, buildDeviceScope, presentDeviceId } from "../lib/device";
import { json } from "../utils/responses";
import { andWhere, nowISO, parseFaultsJson } from "../utils";
import { ClientCompactQuerySchema } from "../schemas/client";
import { validationErrorResponse } from "../utils/validation";
import { maskTelemetryNumber } from "../telemetry";
import { loggerForRequest } from "../utils/logging";

export async function handleClientCompact(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const url = new URL(req.url);
  const paramsResult = ClientCompactQuerySchema.safeParse({
    hours: url.searchParams.get("hours"),
    lowDeltaT: url.searchParams.get("lowDeltaT"),
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { hours = 24, lowDeltaT = 2 } = paramsResult.data;
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;

  if (scope.empty) {
    return json({
      generated_at: nowISO(),
      scope: "empty",
      window_start_ms: sinceMs,
      kpis: {
        devices_total: 0,
        devices_online: 0,
        offline_count: 0,
        online_pct: 0,
        avg_cop: null,
        low_deltaT_count: 0,
        open_alerts: 0,
        max_heartbeat_age_sec: null,
      },
      alerts: [],
      top_devices: [],
      trend: [],
    });
  }

  let where = "";
  const bind: any[] = [];
  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }

  const totalRow = await env.DB
    .prepare(`SELECT COUNT(*) AS c FROM devices d ${where}`)
    .bind(...bind)
    .first<{ c: number }>();
  const onlineRow = await env.DB
    .prepare(`SELECT COUNT(*) AS c FROM devices d ${andWhere(where, "d.online = 1")}`)
    .bind(...bind)
    .first<{ c: number }>();

  const devices_total = totalRow?.c ?? 0;
  const devices_online = onlineRow?.c ?? 0;
  const offline_count = Math.max(0, devices_total - devices_online);
  const online_pct = devices_total ? Math.round((devices_online / devices_total) * 100) : 0;

  const telemWhere = andWhere(where, "t.ts >= ?");
  const telemBind = [...bind, sinceMs];

  const avgRow = await env.DB
    .prepare(
      `SELECT AVG(t.cop) AS v
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${telemWhere}`,
    )
    .bind(...telemBind)
    .first<{ v: number | null }>();

  const lowWhere = andWhere(telemWhere, "t.deltaT IS NOT NULL AND t.deltaT < ?");
  const lowBind = [...telemBind, lowDeltaT];
  const lowRow = await env.DB
    .prepare(
      `SELECT COUNT(*) AS c
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${lowWhere}`,
    )
    .bind(...lowBind)
    .first<{ c: number }>();

  const hbRow = await env.DB
    .prepare(
      `SELECT MAX(
          CASE WHEN d.last_seen_at IS NULL THEN NULL
               ELSE (strftime('%s','now') - strftime('%s', d.last_seen_at))
          END
        ) AS s
       FROM devices d
       ${where}`,
    )
    .bind(...bind)
    .first<{ s: number | null }>();

  const alertsRows = await env.DB
    .prepare(
      `SELECT t.device_id, t.ts, t.faults_json, d.site, ls.updated_at
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         LEFT JOIN latest_state ls ON ls.device_id = t.device_id
         ${andWhere(telemWhere, "t.faults_json IS NOT NULL AND t.faults_json != '[]' AND t.faults_json != ''")}
        ORDER BY t.ts DESC
        LIMIT 12`,
    )
    .bind(...telemBind)
    .all<{
      device_id: string;
      ts: number;
      faults_json: string | null;
      site: string | null;
      updated_at: string | null;
    }>();

  let alerts;
  try {
    alerts = await Promise.all(
      (alertsRows.results ?? []).map(async (row) => {
        const faults = parseFaultsJson(row.faults_json);
        return {
          device_id: presentDeviceId(row.device_id, scope.isAdmin),
          lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
          site: row.site ?? null,
          ts: new Date(row.ts).toISOString(),
          updated_at: row.updated_at ?? null,
          faults,
          fault_count: faults.length,
        };
      }),
    );
  } catch (err) {
    loggerForRequest(req, { route: "/api/client/compact" }).error("client.alerts_payload_failed", {
      error: err,
    });
    return json({ error: "Server error" }, { status: 500 });
  }

  const openAlertsTotal = alerts.filter((a: any) => a.fault_count > 0).length;

  const topRows = await env.DB
    .prepare(
      `SELECT d.device_id, d.site, d.online, d.last_seen_at, ls.cop, ls.deltaT, ls.thermalKW, ls.faults_json, ls.updated_at
         FROM devices d
         LEFT JOIN latest_state ls ON ls.device_id = d.device_id
         ${where}
        ORDER BY d.online DESC, (d.last_seen_at IS NULL), d.last_seen_at DESC, d.device_id ASC
        LIMIT 8`,
    )
    .bind(...bind)
    .all<{
      device_id: string;
      site: string | null;
      online: number;
      last_seen_at: string | null;
      cop: number | null;
      deltaT: number | null;
      thermalKW: number | null;
      faults_json: string | null;
      updated_at: string | null;
    }>();

  let topDevices;
  try {
    topDevices = await Promise.all(
      (topRows.results ?? []).map(async (row) => {
        const faults = parseFaultsJson(row.faults_json);
        return {
          device_id: presentDeviceId(row.device_id, scope.isAdmin),
          lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
          site: row.site ?? null,
          online: !!row.online,
          last_seen_at: row.last_seen_at ?? null,
          updated_at: row.updated_at ?? null,
          cop: maskTelemetryNumber(row.cop, scope.isAdmin, 1, 2),
          deltaT: maskTelemetryNumber(row.deltaT, scope.isAdmin, 1, 2),
          thermalKW: maskTelemetryNumber(row.thermalKW, scope.isAdmin, 1, 2),
          alert_count: faults.length,
        };
      }),
    );
  } catch (err) {
    loggerForRequest(req, { route: "/api/client/compact" }).error("client.top_devices_payload_failed", {
      error: err,
    });
    return json({ error: "Server error" }, { status: 500 });
  }

  const telemetryRows = await env.DB
    .prepare(
      `SELECT t.ts, t.cop, t.thermalKW, t.deltaT
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${telemWhere}
        ORDER BY t.ts DESC
        LIMIT 160`,
    )
    .bind(...telemBind)
    .all<{
      ts: number;
      cop: number | null;
      thermalKW: number | null;
      deltaT: number | null;
    }>();

  const bucketCount = 8;
  const nowMs = Date.now();
  const spanMs = Math.max(1, nowMs - sinceMs);
  const bucketMs = spanMs / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    start: sinceMs + i * bucketMs,
    end: sinceMs + (i + 1) * bucketMs,
    count: 0,
    cop: 0,
    thermal: 0,
    delta: 0,
  }));

  for (const row of telemetryRows.results ?? []) {
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((row.ts - sinceMs) / bucketMs)));
    const bucket = buckets[idx];
    bucket.count += 1;
    if (typeof row.cop === "number") bucket.cop += row.cop;
    if (typeof row.thermalKW === "number") bucket.thermal += row.thermalKW;
    if (typeof row.deltaT === "number") bucket.delta += row.deltaT;
  }

  const trend = buckets.map((bucket) => {
    const avgCop = bucket.count ? bucket.cop / bucket.count : null;
    const avgThermal = bucket.count ? bucket.thermal / bucket.count : null;
    const avgDelta = bucket.count ? bucket.delta / bucket.count : null;
    return {
      label: new Date(Math.min(nowMs, bucket.end)).toISOString(),
      cop: maskTelemetryNumber(avgCop, scope.isAdmin, 1, 2),
      thermalKW: maskTelemetryNumber(avgThermal, scope.isAdmin, 1, 2),
      deltaT: maskTelemetryNumber(avgDelta, scope.isAdmin, 1, 2),
    };
  });

  return json({
    generated_at: nowISO(),
    scope: scope.isAdmin ? "fleet" : "tenant",
    window_start_ms: sinceMs,
    kpis: {
      devices_total,
      devices_online,
      offline_count,
      online_pct,
      avg_cop: maskTelemetryNumber(avgRow?.v ?? null, scope.isAdmin, 1, 2),
      low_deltaT_count: lowRow?.c ?? 0,
      open_alerts: openAlertsTotal,
      max_heartbeat_age_sec: hbRow?.s ?? null,
    },
    alerts,
    top_devices: topDevices,
    trend,
  });
}
