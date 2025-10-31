import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { buildDeviceLookup, buildDeviceScope, presentDeviceId } from "../lib/device";
import { json } from "../utils/responses";
import { andWhere, nowISO, parseFaultsJson } from "../utils";
import { ArchiveQuerySchema } from "../schemas/archive";
import { validationErrorResponse } from "../utils/validation";
import { maskTelemetryNumber } from "../telemetry";

export async function handleArchive(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const url = new URL(req.url);
  const paramsResult = ArchiveQuerySchema.safeParse({
    offlineHours: url.searchParams.get("offlineHours"),
    days: url.searchParams.get("days"),
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { offlineHours = 72, days = 14 } = paramsResult.data;
  const offlineThreshold = new Date(Date.now() - offlineHours * 60 * 60 * 1000).toISOString();

  const historySinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

  if (scope.empty) {
    return json({ generated_at: nowISO(), offline: [], history: [] });
  }

  let where = "";
  const bind: any[] = [];
  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }

  const offlineWhere = andWhere(where, "(d.last_seen_at IS NULL OR d.last_seen_at < ?)");
  const offlineRows = await env.DB
    .prepare(
      `SELECT d.device_id, d.site, d.last_seen_at, d.online, ls.cop, ls.deltaT, ls.faults_json, ls.updated_at
         FROM devices d
         LEFT JOIN latest_state ls ON ls.device_id = d.device_id
         ${offlineWhere}
        ORDER BY d.last_seen_at IS NOT NULL, d.last_seen_at ASC
        LIMIT 25`,
    )
    .bind(...bind, offlineThreshold)
    .all<{
      device_id: string;
      site: string | null;
      last_seen_at: string | null;
      online: number;
      cop: number | null;
      deltaT: number | null;
      faults_json: string | null;
      updated_at: string | null;
    }>();

  let offline;
  try {
    offline = await Promise.all(
      (offlineRows.results ?? []).map(async (row) => ({
        device_id: presentDeviceId(row.device_id, scope.isAdmin),
        lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
        site: row.site ?? null,
        last_seen_at: row.last_seen_at ?? null,
        online: !!row.online,
        cop: maskTelemetryNumber(row.cop, scope.isAdmin, 1, 2),
        deltaT: maskTelemetryNumber(row.deltaT, scope.isAdmin, 1, 2),
        alerts: parseFaultsJson(row.faults_json).length,
        updated_at: row.updated_at ?? null,
      })),
    );
  } catch (err) {
    console.error("Failed to build archive offline payload", err);
    return json({ error: "Server error" }, { status: 500 });
  }

  const historyWhere = andWhere(andWhere(where, "t.ts >= ?"), "t.ts IS NOT NULL");
  const historyRows = await env.DB
    .prepare(
      `SELECT DATE(t.ts / 1000, 'unixepoch') AS day, COUNT(*) AS samples
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${historyWhere}
        GROUP BY DATE(t.ts / 1000, 'unixepoch')
        ORDER BY day DESC
        LIMIT ${days}`,
    )
    .bind(...bind, historySinceMs)
    .all<{ day: string; samples: number }>();

  const history = (historyRows.results ?? []).map((row) => ({
    day: row.day,
    samples: row.samples,
  }));

  return json({
    generated_at: nowISO(),
    offline,
    history,
  });
}
