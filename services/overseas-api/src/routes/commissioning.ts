import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { buildDeviceLookup, buildDeviceScope, presentDeviceId } from "../lib/device";
import { json } from "../utils/responses";
import { andWhere, nowISO } from "../utils";
import { loggerForRequest } from "../utils/logging";

export async function handleCommissioning(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  if (scope.empty && !scope.isAdmin) {
    return json({ generated_at: nowISO(), devices: [], summary: { total: 0, ready: 0 } });
  }

  let where = "";
  const bind: any[] = [];
  if (!scope.isAdmin) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }

  const rows = await env.DB
    .prepare(
      `SELECT d.device_id, d.site, d.online, d.last_seen_at,
              ls.supplyC, ls.returnC, ls.deltaT, ls.flowLps, ls.cop, ls.thermalKW,
              ls.mode, ls.defrost, ls.powerKW, ls.updated_at
         FROM devices d
         LEFT JOIN latest_state ls ON ls.device_id = d.device_id
         ${where}
        ORDER BY d.device_id ASC`,
    )
    .bind(...bind)
    .all<{
      device_id: string;
      site: string | null;
      online: number;
      last_seen_at: string | null;
      supplyC: number | null;
      returnC: number | null;
      deltaT: number | null;
      flowLps: number | null;
      cop: number | null;
      thermalKW: number | null;
      mode: string | null;
      defrost: number | null;
      powerKW: number | null;
      updated_at: string | null;
    }>();

  let devices;
  try {
    devices = await Promise.all(
      (rows.results ?? []).map(async (row) => ({
        device_id: presentDeviceId(row.device_id, scope.isAdmin),
        lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
        site: row.site ?? null,
        online: !!row.online,
        last_seen_at: row.last_seen_at ?? null,
        supplyC: row.supplyC ?? null,
        returnC: row.returnC ?? null,
        deltaT: row.deltaT ?? null,
        flowLps: row.flowLps ?? null,
        cop: row.cop ?? null,
        thermalKW: row.thermalKW ?? null,
        mode: row.mode ?? null,
        defrost: row.defrost ?? null,
        powerKW: row.powerKW ?? null,
        updated_at: row.updated_at ?? null,
      })),
    );
  } catch (err) {
    loggerForRequest(req, { route: "/api/commissioning/checklist" }).error(
      "commissioning.payload_failed",
      { error: err },
    );
    return json({ error: "Server error" }, { status: 500 });
  }

  const ready = devices.filter((d: any) => d.online && d.deltaT !== null && d.flowLps !== null).length;

  return json({
    generated_at: nowISO(),
    devices,
    summary: {
      total: devices.length,
      ready,
    },
  });
}
