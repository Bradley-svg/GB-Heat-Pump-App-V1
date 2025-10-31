import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { buildDeviceLookup, buildDeviceScope, presentDeviceId } from "../lib/device";
import { json } from "../lib/http";
import { andWhere, nowISO } from "../lib/utils";

export async function handleAdminOverview(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const url = new URL(req.url);

  let tenants;
  if (scope.isAdmin) {
    tenants = await env.DB
      .prepare(
        `SELECT COALESCE(d.profile_id, 'unassigned') AS profile_id,
                COUNT(*) AS device_count,
                SUM(d.online) AS online_count
           FROM devices d
          GROUP BY COALESCE(d.profile_id, 'unassigned')
          ORDER BY device_count DESC`,
      )
      .all<{
        profile_id: string;
        device_count: number;
        online_count: number | null;
      }>();
  } else if (scope.empty) {
    tenants = { results: [] as any[] };
  } else {
    const where = andWhere("", scope.clause);
    tenants = await env.DB
      .prepare(
        `SELECT d.profile_id AS profile_id,
                COUNT(*) AS device_count,
                SUM(d.online) AS online_count
           FROM devices d
           ${where}
          GROUP BY d.profile_id`,
      )
      .bind(...scope.bind)
      .all<{
        profile_id: string | null;
        device_count: number;
        online_count: number | null;
      }>();
  }

  const rawLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 40;

  let opsRows;
  if (scope.isAdmin) {
    opsRows = await env.DB
      .prepare(
        `SELECT ts, route, status_code, duration_ms, device_id
           FROM ops_metrics
          ORDER BY ts DESC
          LIMIT ${limit}`,
      )
      .all<{
        ts: string;
        route: string;
        status_code: number;
        duration_ms: number;
        device_id: string | null;
      }>();
  } else if (scope.empty) {
    opsRows = { results: [] as any[] };
  } else {
    const where = andWhere("", scope.clause.replace(/\bd\./g, "devices."));
    opsRows = await env.DB
      .prepare(
        `SELECT o.ts, o.route, o.status_code, o.duration_ms, o.device_id
           FROM ops_metrics o
           JOIN devices ON devices.device_id = o.device_id
           ${where}
          ORDER BY o.ts DESC
          LIMIT ${limit}`,
      )
      .bind(...scope.bind)
      .all<{
        ts: string;
        route: string;
        status_code: number;
        duration_ms: number;
        device_id: string | null;
      }>();
  }

  const ops = [] as any[];
  for (const row of opsRows.results ?? []) {
    const deviceId = row.device_id;
    let lookupToken: string | null = null;
    let outwardId: string | null = null;
    if (deviceId) {
      try {
        lookupToken = await buildDeviceLookup(deviceId, env, scope.isAdmin);
        outwardId = presentDeviceId(deviceId, scope.isAdmin);
      } catch (err) {
        console.error("Failed to build ops lookup", err);
        return json({ error: "Server error" }, { status: 500 });
      }
    }

    ops.push({
      ts: row.ts,
      route: row.route,
      status_code: row.status_code,
      duration_ms: row.duration_ms,
      device_id: outwardId,
      lookup: lookupToken,
    });
  }

  const statusCounts = ops.reduce<Record<string, number>>((acc, item) => {
    const bucket = item.status_code >= 500 ? "5xx" : item.status_code >= 400 ? "4xx" : "ok";
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});

  return json({
    generated_at: nowISO(),
    scope: scope.isAdmin ? "admin" : scope.empty ? "empty" : "tenant",
    tenants:
      tenants.results?.map((row) => ({
        profile_id: row.profile_id ?? "unassigned",
        device_count: row.device_count ?? 0,
        online_count: row.online_count ?? 0,
      })) ?? [],
    ops,
    ops_summary: statusCounts,
  });
}
