import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { buildDeviceLookup, buildDeviceScope, presentDeviceId } from "../lib/device";
import { json } from "../utils/responses";
import { andWhere, nowISO, parseFaultsJson } from "../utils";
import { AlertsQuerySchema } from "../schemas/alerts";
import { validationErrorResponse } from "../utils/validation";

export async function handleAlertsFeed(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const url = new URL(req.url);
  const paramsResult = AlertsQuerySchema.safeParse({
    limit: url.searchParams.get("limit"),
    hours: url.searchParams.get("hours"),
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { limit = 40, hours = 72 } = paramsResult.data;
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;

  if (scope.empty) {
    return json({ generated_at: nowISO(), items: [], stats: { total: 0, active: 0 } });
  }

  let where = "";
  const bind: any[] = [];
  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }

  const faultsWhere = andWhere(
    andWhere(where, "t.ts >= ?"),
    "t.faults_json IS NOT NULL AND t.faults_json != '[]' AND t.faults_json != ''",
  );
  const faultRows = await env.DB
    .prepare(
      `SELECT t.device_id, t.ts, t.faults_json, d.site, ls.updated_at AS last_update, ls.faults_json AS latest_faults
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         LEFT JOIN latest_state ls ON ls.device_id = t.device_id
         ${faultsWhere}
        ORDER BY t.ts DESC
        LIMIT ${limit}`,
    )
    .bind(...bind, sinceMs)
    .all<{
      device_id: string;
      ts: number;
      faults_json: string | null;
      site: string | null;
      last_update: string | null;
      latest_faults: string | null;
    }>();

  let items;
  try {
    items = await Promise.all(
      (faultRows.results ?? []).map(async (row) => {
        const faults = parseFaultsJson(row.faults_json);
        const activeFaults = parseFaultsJson(row.latest_faults);
        return {
          device_id: presentDeviceId(row.device_id, scope.isAdmin),
          lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
          site: row.site ?? null,
          ts: new Date(row.ts).toISOString(),
          fault_count: faults.length,
          faults,
          active: activeFaults.length > 0,
          active_faults: activeFaults,
          last_update: row.last_update ?? null,
        };
      }),
    );
  } catch (err) {
    console.error("Failed to build alerts feed", err);
    return json({ error: "Server error" }, { status: 500 });
  }

  const active = items.filter((i: any) => i.active).length;

  return json({
    generated_at: nowISO(),
    items,
    stats: {
      total: items.length,
      active,
    },
  });
}
