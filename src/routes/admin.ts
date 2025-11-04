import type { Env, User } from "../env";
import { requireAccessUser, userIsAdmin } from "../lib/access";
import { buildDeviceLookup, buildDeviceScope, presentDeviceId } from "../lib/device";
import { json } from "../utils/responses";
import { andWhere, nowISO } from "../utils";
import { AdminOverviewQuerySchema } from "../schemas/admin";
import { validationErrorResponse } from "../utils/validation";
import { loggerForRequest } from "../utils/logging";
import {
  OPS_METRICS_WINDOW_DAYS,
  opsMetricsWindowStart,
  pruneOpsMetrics,
} from "../lib/ops-metrics";

async function buildOverviewResponse(
  req: Request,
  env: Env,
  user: User,
  routeTag: string,
) {
  const log = loggerForRequest(req, { route: routeTag });
  const scope = buildDeviceScope(user);
  const url = new URL(req.url);
  const paramsResult = AdminOverviewQuerySchema.safeParse({
    limit: url.searchParams.get("limit"),
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { limit } = paramsResult.data;

  const now = Date.now();
  const windowStart = opsMetricsWindowStart(now);
  await pruneOpsMetrics(env, now);

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

  let opsRows;
  if (scope.isAdmin) {
    opsRows = await env.DB
      .prepare(
        `SELECT ts, route, status_code, duration_ms, device_id
           FROM ops_metrics
          WHERE ts >= ?
          ORDER BY ts DESC
          LIMIT ?`,
      )
      .bind(windowStart, limit)
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
    const tenantClause = scope.clause.replace(/\bd\./g, "devices.");
    const where = andWhere("WHERE o.ts >= ?", tenantClause);
    opsRows = await env.DB
      .prepare(
        `SELECT o.ts, o.route, o.status_code, o.duration_ms, o.device_id
           FROM ops_metrics o
           JOIN devices ON devices.device_id = o.device_id
           ${where}
          ORDER BY o.ts DESC
          LIMIT ?`,
      )
      .bind(windowStart, ...scope.bind, limit)
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
      outwardId = presentDeviceId(deviceId, scope.isAdmin);
      try {
        lookupToken = await buildDeviceLookup(deviceId, env, scope.isAdmin);
      } catch (err) {
        log.error("admin.lookup_failed", { device_id: deviceId, error: err });
        continue;
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
    ops_window: {
      start: windowStart,
      days: OPS_METRICS_WINDOW_DAYS,
    },
  });
}

export async function handleAdminOverview(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!userIsAdmin(user)) return json({ error: "Forbidden" }, { status: 403 });
  return buildOverviewResponse(req, env, user, "/api/admin/overview");
}

export async function handleFleetAdminOverview(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return buildOverviewResponse(req, env, user, "/api/fleet/admin-overview");
}
