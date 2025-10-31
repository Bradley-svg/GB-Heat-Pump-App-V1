import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { buildDeviceScope } from "../lib/device";
import { json } from "../lib/http";
import { andWhere, nowISO } from "../lib/utils";

export async function handleFleetSummary(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const url = new URL(req.url);

  const rawHours = Number(url.searchParams.get("hours"));
  const hours = Number.isFinite(rawHours) && rawHours > 0 ? Math.min(168, Math.floor(rawHours)) : 24;
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;

  const lowDeltaParam = url.searchParams.get("lowDeltaT");
  let lowDeltaT = 2;
  if (lowDeltaParam !== null && lowDeltaParam.trim() !== "") {
    const parsed = Number(lowDeltaParam);
    if (Number.isFinite(parsed) && parsed >= 0) {
      lowDeltaT = parsed;
    }
  }

  let where = "";
  const bind: any[] = [];

  if (scope.empty) {
    return json({
      devices_total: 0,
      devices_online: 0,
      online_pct: 0,
      avg_cop_24h: null,
      low_deltaT_count_24h: 0,
      max_heartbeat_age_sec: null,
      window_start_ms: sinceMs,
      generated_at: nowISO(),
    });
  }

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

  return json({
    devices_total,
    devices_online,
    online_pct,
    avg_cop_24h: avgRow?.v ?? null,
    low_deltaT_count_24h: lowRow?.c ?? 0,
    max_heartbeat_age_sec: hbRow?.s ?? null,
    window_start_ms: sinceMs,
    generated_at: nowISO(),
  });
}
