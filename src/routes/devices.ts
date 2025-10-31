import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { parseCursorId, sealCursorId } from "../lib/cursor";
import {
  buildDeviceLookup,
  buildDeviceScope,
  presentDeviceId,
  resolveDeviceId,
  userIsAdmin,
} from "../lib/device";
import { json } from "../utils/responses";
import { parseMetricsJson, safeDecode } from "../utils";
import { DeviceHistoryQuerySchema, ListDevicesQuerySchema } from "../schemas/devices";
import { validationErrorResponse } from "../utils/validation";
import { loggerForRequest } from "../utils/logging";

export async function handleLatest(req: Request, env: Env, deviceId: string) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = userIsAdmin(user);
  const resolvedId = await resolveDeviceId(deviceId, env, isAdmin);
  if (!resolvedId) return json({ error: "Not found" }, { status: 404 });
  let row: any | null;

  if (isAdmin) {
    row = await env.DB.prepare(`SELECT * FROM latest_state WHERE device_id = ?1 LIMIT 1`)
      .bind(resolvedId)
      .first();
  } else {
    if (!user.clientIds || user.clientIds.length === 0) {
      return json({ error: "Not found" }, { status: 404 });
    }
    const placeholders = user.clientIds.map((_, i) => `?${i + 2}`).join(",");
    row = await env.DB.prepare(
      `SELECT ls.*
         FROM latest_state ls
         JOIN devices d ON d.device_id = ls.device_id
        WHERE ls.device_id = ?1
          AND d.profile_id IN (${placeholders})
        LIMIT 1`,
    )
      .bind(resolvedId, ...user.clientIds)
      .first();
  }

  if (!row) return json({ error: "Not found" }, { status: 404 });

  let outwardDeviceId = presentDeviceId(resolvedId, isAdmin);
  let latest = row;
  if (!isAdmin) {
    const { device_id: _drop, ...rest } = row;
    latest = rest;
  }

  return json({ device_id: outwardDeviceId, latest });
}

export async function handleListDevices(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = userIsAdmin(user);
  const url = new URL(req.url);
  const paramsResult = ListDevicesQuerySchema.safeParse({
    mine: url.searchParams.get("mine"),
    limit: url.searchParams.get("limit"),
    cursor: url.searchParams.get("cursor"),
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { mine: mineParam, limit = 50, cursor } = paramsResult.data;
  const mine = mineParam ?? !isAdmin;
  const rawCursor = cursor ?? null;
  let cursorPhase: "ts" | "null" | null = null;
  let cursorTs: string | null = null;
  let cursorId: string | null = null;
  if (rawCursor) {
    const parts = rawCursor.split("|", 3);
    const phase = parts[0];
    if (phase === "ts") {
      cursorPhase = "ts";
      const tsPart = parts[1] ?? null;
      cursorTs = safeDecode(tsPart);
      if (tsPart && cursorTs === null) return json({ error: "Invalid cursor" }, { status: 400 });
      const idPartRaw = parts.length >= 3 ? parts[2] ?? null : null;
      const idPart = safeDecode(idPartRaw);
      if (idPartRaw && idPart === null) return json({ error: "Invalid cursor" }, { status: 400 });
      if (idPart) {
        const parsed = await parseCursorId(idPart, env, isAdmin);
        if (!parsed.ok) return json({ error: "Invalid cursor" }, { status: 400 });
        cursorId = parsed.id;
      }
    } else if (phase === "null") {
      cursorPhase = "null";
      const idPartRaw = parts[1] ?? null;
      const idPart = safeDecode(idPartRaw);
      if (!idPart) return json({ error: "Invalid cursor" }, { status: 400 });
      const parsed = await parseCursorId(idPart, env, isAdmin);
      if (!parsed.ok || !parsed.id) return json({ error: "Invalid cursor" }, { status: 400 });
      cursorId = parsed.id;
    }
  }

  let where = "";
  const bind: any[] = [];

  if (mine) {
    if (!user.clientIds?.length) return json({ items: [], next: null });
    const ph = user.clientIds.map((_, i) => `?${i + 1}`).join(",");
    where = `WHERE d.profile_id IN (${ph})`;
    bind.push(...user.clientIds);
  }

  if (cursorPhase === "ts" && cursorTs) {
    where += where ? " AND" : "WHERE";
    if (cursorId) {
      where +=
        " ((d.last_seen_at IS NOT NULL AND (d.last_seen_at < ? OR (d.last_seen_at = ? AND d.device_id > ?))) OR d.last_seen_at IS NULL)";
      bind.push(cursorTs, cursorTs, cursorId);
    } else {
      where += " ((d.last_seen_at IS NOT NULL AND d.last_seen_at < ?) OR d.last_seen_at IS NULL)";
      bind.push(cursorTs);
    }
  } else if (cursorPhase === "null" && cursorId) {
    where += where ? " AND" : "WHERE";
    where += " (d.last_seen_at IS NULL AND d.device_id > ?)";
    bind.push(cursorId);
  }

  const sql = `
    SELECT d.device_id, d.profile_id, d.site, d.firmware, d.map_version,
           d.online, d.last_seen_at
      FROM devices d
      ${where}
     ORDER BY (d.last_seen_at IS NOT NULL) DESC, d.last_seen_at DESC, d.device_id ASC
     LIMIT ${limit + 1}
  `;

  const rows = (
    await env.DB.prepare(sql).bind(...bind).all<{
      device_id: string;
      profile_id: string;
      online: number;
      last_seen_at: string | null;
    }>()
  ).results ?? [];

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  let items;
  try {
    items = await Promise.all(
      slice.map(async (r) => ({
        device_id: presentDeviceId(r.device_id, isAdmin),
        lookup: await buildDeviceLookup(r.device_id, env, isAdmin),
        profile_id: r.profile_id,
        online: !!r.online,
        last_seen_at: r.last_seen_at,
        site: (r as any).site ?? null,
        firmware: (r as any).firmware ?? null,
        map_version: (r as any).map_version ?? null,
      })),
    );
  } catch (err) {
    loggerForRequest(req, { route: "/api/devices" }).error("devices.list_failed", {
      error: err,
    });
    return json({ error: "Server error" }, { status: 500 });
  }

  let next: string | null = null;
  if (hasMore) {
    const last = slice[slice.length - 1];
    let cursorDeviceId = last.device_id;
    if (!isAdmin) {
      try {
        cursorDeviceId = await sealCursorId(env, last.device_id);
      } catch (err) {
        loggerForRequest(req, { route: "/api/devices" }).error("devices.cursor_seal_failed", {
          error: err,
        });
        return json({ error: "Server error" }, { status: 500 });
      }
    }
    next = last.last_seen_at
      ? `ts|${encodeURIComponent(last.last_seen_at)}|${encodeURIComponent(cursorDeviceId)}`
      : `null|${encodeURIComponent(cursorDeviceId)}`;
  }

  return json({ items, next });
}

export async function handleDeviceHistory(req: Request, env: Env, rawDeviceId: string) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const resolvedId = await resolveDeviceId(rawDeviceId, env, scope.isAdmin);
  if (!resolvedId) return json({ error: "Not found" }, { status: 404 });

  if (!scope.isAdmin) {
    if (scope.empty) return json({ error: "Not found" }, { status: 404 });
    const owned = await env.DB.prepare(
      `SELECT 1 FROM devices d WHERE d.device_id = ?1 AND ${scope.clause} LIMIT 1`,
    )
      .bind(resolvedId, ...scope.bind)
      .first();
    if (!owned) return json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const paramsResult = DeviceHistoryQuerySchema.safeParse({
    limit: url.searchParams.get("limit"),
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { limit = 72 } = paramsResult.data;

  const rows = await env.DB
    .prepare(
      `SELECT ts, metrics_json, deltaT, thermalKW, cop
         FROM telemetry
        WHERE device_id = ?1
        ORDER BY ts DESC
        LIMIT ${limit}`,
    )
    .bind(resolvedId)
    .all<{
      ts: number;
      metrics_json: string | null;
      deltaT: number | null;
      thermalKW: number | null;
      cop: number | null;
    }>();

  const items = (rows.results ?? []).map((row) => {
    const metrics = parseMetricsJson(row.metrics_json);
    return {
      ts: new Date(row.ts).toISOString(),
      deltaT: row.deltaT ?? null,
      thermalKW: row.thermalKW ?? null,
      cop: row.cop ?? null,
      supplyC: metrics.supplyC ?? null,
      returnC: metrics.returnC ?? null,
      tankC: metrics.tankC ?? null,
      ambientC: metrics.ambientC ?? null,
      flowLps: metrics.flowLps ?? null,
      powerKW: metrics.powerKW ?? null,
      mode: metrics.mode ?? null,
      defrost: metrics.defrost ?? null,
    };
  }).reverse();

  let lookupToken: string;
  try {
    lookupToken = await buildDeviceLookup(resolvedId, env, scope.isAdmin);
  } catch (err) {
    loggerForRequest(req, {
      route: "/api/devices/:id/history",
      device_id: resolvedId,
      request_device_id: rawDeviceId,
    }).error("devices.history_lookup_failed", { error: err });
    return json({ error: "Server error" }, { status: 500 });
  }

  return json({
    device_id: presentDeviceId(resolvedId, scope.isAdmin),
    lookup: lookupToken,
    items,
  });
}
