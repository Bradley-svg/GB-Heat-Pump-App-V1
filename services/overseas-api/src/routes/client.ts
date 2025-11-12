import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { buildDeviceLookup, buildDeviceScope, presentDeviceId } from "../lib/device";
import { readJsonCache, writeJsonCache } from "../lib/cache";
import { json } from "../utils/responses";
import { andWhere, nowISO, parseFaultsJson } from "../utils";
import { ClientCompactQuerySchema } from "../schemas/client";
import { validationErrorResponse } from "../utils/validation";
import { maskTelemetryNumber } from "../telemetry";
import { loggerForRequest, type Logger } from "../utils/logging";
import {
  DASHBOARD_CACHE_AREA,
  getDashboardTokenSignature,
  scopeIdsForProfiles,
} from "../lib/dashboard-cache";

const CLIENT_COMPACT_CACHE_VERSION = 1;
const TRUE_TOKENS = new Set(["1", "true", "yes", "on"]);

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function shouldProfileQueries(env: Env): boolean {
  const raw = env.CLIENT_QUERY_PROFILE;
  if (!raw) return false;
  return TRUE_TOKENS.has(raw.trim().toLowerCase());
}

function resolveScopeCacheKey(scope: ReturnType<typeof buildDeviceScope>): string {
  if (scope.isAdmin) return "admin";
  if (scope.empty) return "empty";
  if (!scope.bind || scope.bind.length === 0) return "tenant:none";
  const tokens = scope.bind.map((value) => String(value)).sort();
  return `tenant:${tokens.join(",")}`;
}

function buildClientCompactCacheKey(
  scopeKey: string,
  tokenSignature: string,
  hours: number,
  lowDeltaT: number,
): string {
  return `client-compact:v${CLIENT_COMPACT_CACHE_VERSION}:t${tokenSignature}:${scopeKey}:h${hours}:d${lowDeltaT}`;
}

function resolveClientCompactCacheTtl(env: Env): number {
  return parsePositiveInt(env.CLIENT_COMPACT_CACHE_TTL_SECS, 45);
}

function resolveProfileThreshold(env: Env): number {
  return parsePositiveInt(env.CLIENT_QUERY_PROFILE_THRESHOLD_MS, 50);
}

interface QueryProfiler {
  run<T>(label: string, fn: () => Promise<T>): Promise<T>;
}

function createQueryProfiler(env: Env, logger: Logger): QueryProfiler {
  if (!shouldProfileQueries(env)) {
    return {
      run: (_label, fn) => fn(),
    };
  }
  const threshold = resolveProfileThreshold(env);
  return {
    async run<T>(label: string, fn: () => Promise<T>): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - start;
        if (duration >= threshold) {
          logger.debug("client.query_profile", { label, duration_ms: duration });
        }
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.warn("client.query_profile_failed", { label, duration_ms: duration, error });
        throw error;
      }
    },
  };
}

type FaultEntry = ReturnType<typeof parseFaultsJson>[number];

interface CachedAlertRow {
  device_id: string;
  site: string | null;
  ts: number;
  updated_at: string | null;
  faults: FaultEntry[];
}

interface CachedTopDeviceRow {
  device_id: string;
  site: string | null;
  online: boolean;
  last_seen_at: string | null;
  updated_at: string | null;
  supplyC: number | null;
  returnC: number | null;
  cop: number | null;
  deltaT: number | null;
  thermalKW: number | null;
  faults: FaultEntry[];
}

interface CachedTrendRow {
  label: string;
  cop: number | null;
  thermalKW: number | null;
  deltaT: number | null;
}

interface ClientCompactCachePayload {
  version: number;
  generated_at: string;
  window_start_ms: number;
  kpis: {
    devices_total: number;
    devices_online: number;
    offline_count: number;
    online_pct: number;
    avg_cop: number | null;
    low_deltaT_count: number;
    open_alerts: number;
    max_heartbeat_age_sec: number | null;
  };
  alerts: CachedAlertRow[];
  top_devices: CachedTopDeviceRow[];
  trend: CachedTrendRow[];
}

export async function handleClientCompact(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const logger = loggerForRequest(req, { route: "/api/client/compact" });
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
      scope: "empty" as const,
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

  const scopeKey = resolveScopeCacheKey(scope);
  const profileIds =
    scope.isAdmin || scope.empty ? [] : (scope.bind ?? []).map((value) => String(value));
  const scopeIds = scopeIdsForProfiles(profileIds);
  const tokenSignature = await getDashboardTokenSignature(
    env,
    DASHBOARD_CACHE_AREA.clientCompact,
    scopeIds,
  );
  const cacheKey = buildClientCompactCacheKey(scopeKey, tokenSignature, hours, lowDeltaT);
  const cacheTtl = resolveClientCompactCacheTtl(env);

  if (scopeKey !== "empty") {
    const cached = await readJsonCache<ClientCompactCachePayload>(cacheKey, { logger });
    if (cached && cached.version === CLIENT_COMPACT_CACHE_VERSION) {
      try {
        const responsePayload = await presentClientCompactResponse(cached, env, scope, logger);
        return json(responsePayload);
      } catch (error) {
        logger.error("client.cache_present_failed", { error });
        return json({ error: "Server error" }, { status: 500 });
      }
    }
  }

  const profiler = createQueryProfiler(env, logger);

  const totalRow = await profiler.run("devices.total", () =>
    env.DB
      .prepare(`SELECT COUNT(*) AS c FROM devices d ${where}`)
      .bind(...bind)
      .first<{ c: number | string | null }>(),
  );
  const devicesTotal = Number(totalRow?.c ?? 0);

  const onlineWhere = andWhere(where, "d.online = 1");
  const onlineRow = await profiler.run("devices.online", () =>
    env.DB
      .prepare(`SELECT COUNT(*) AS c FROM devices d ${onlineWhere}`)
      .bind(...bind)
      .first<{ c: number | string | null }>(),
  );
  const devicesOnline = Number(onlineRow?.c ?? 0);
  const offlineCount = Math.max(0, devicesTotal - devicesOnline);
  const onlinePct = devicesTotal ? Math.round((devicesOnline / devicesTotal) * 100) : 0;

  const telemWhere = andWhere(where, "t.ts >= ?");
  const telemBind = [...bind, sinceMs];

  const avgRow = await profiler.run("telemetry.avg_cop", () =>
    env.DB
      .prepare(
        `SELECT AVG(t.cop) AS v
           FROM telemetry t
           JOIN devices d ON d.device_id = t.device_id
           ${telemWhere}`,
      )
      .bind(...telemBind)
      .first<{ v: number | string | null }>(),
  );
  const avgCop =
    avgRow?.v === null || avgRow?.v === undefined ? null : Number(avgRow.v);

  const lowWhere = andWhere(telemWhere, "t.deltaT IS NOT NULL AND t.deltaT < ?");
  const lowBind = [...telemBind, lowDeltaT];
  const lowRow = await profiler.run("telemetry.low_delta", () =>
    env.DB
      .prepare(
        `SELECT COUNT(*) AS c
           FROM telemetry t
           JOIN devices d ON d.device_id = t.device_id
           ${lowWhere}`,
      )
      .bind(...lowBind)
      .first<{ c: number | string | null }>(),
  );
  const lowDeltaCount = Number(lowRow?.c ?? 0);

  const hbRow = await profiler.run("devices.max_heartbeat_age", () =>
    env.DB
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
      .first<{ s: number | string | null }>(),
  );
  const maxHeartbeatAge =
    hbRow?.s === null || hbRow?.s === undefined ? null : Number(hbRow.s);

  const alertsRows = await profiler.run("telemetry.alerts", () =>
    env.DB
      .prepare(
        `SELECT t.device_id, t.ts, t.faults_json, d.site, ls.updated_at
           FROM telemetry t
           JOIN devices d ON d.device_id = t.device_id
           LEFT JOIN latest_state ls ON ls.device_id = t.device_id
           ${andWhere(
             telemWhere,
             "t.faults_json IS NOT NULL AND t.faults_json != '[]' AND t.faults_json != ''",
           )}
          ORDER BY t.ts DESC
          LIMIT 12`,
      )
      .bind(...telemBind)
      .all<{
        device_id: string;
        ts: number | string;
        faults_json: string | null;
        site: string | null;
        updated_at: string | null;
      }>(),
  );
  const alertBases: CachedAlertRow[] = (alertsRows.results ?? []).map((row) => {
    const faults = parseFaultsJson(row.faults_json);
    return {
      device_id: row.device_id,
      site: row.site ?? null,
      ts: Number(row.ts),
      updated_at: row.updated_at ?? null,
      faults,
    };
  });
  const openAlertsTotal = alertBases.filter((item) => item.faults.length > 0).length;

  const topRows = await profiler.run("devices.top", () =>
    env.DB
      .prepare(
        `SELECT d.device_id,
                d.site,
                d.online,
                d.last_seen_at,
                ls.supplyC,
                ls.returnC,
                ls.cop,
                ls.deltaT,
                ls.thermalKW,
                ls.faults_json,
                ls.updated_at
           FROM devices d
           LEFT JOIN latest_state ls ON ls.device_id = d.device_id
           ${where}
          ORDER BY d.online DESC,
                   (d.last_seen_at IS NULL),
                   d.last_seen_at DESC,
                   d.device_id ASC
          LIMIT 8`,
      )
      .bind(...bind)
      .all<{
        device_id: string;
        site: string | null;
        online: number | null;
        last_seen_at: string | null;
        supplyC: number | null;
        returnC: number | null;
        cop: number | null;
        deltaT: number | null;
        thermalKW: number | null;
        faults_json: string | null;
        updated_at: string | null;
      }>(),
  );
  const topBases: CachedTopDeviceRow[] = (topRows.results ?? []).map((row) => ({
    device_id: row.device_id,
    site: row.site ?? null,
    online: Boolean(row.online),
    last_seen_at: row.last_seen_at ?? null,
    updated_at: row.updated_at ?? null,
    supplyC: row.supplyC ?? null,
    returnC: row.returnC ?? null,
    cop: row.cop ?? null,
    deltaT: row.deltaT ?? null,
    thermalKW: row.thermalKW ?? null,
    faults: parseFaultsJson(row.faults_json),
  }));

  const telemetryRows = await profiler.run("telemetry.recent", () =>
    env.DB
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
        ts: number | string;
        cop: number | null;
        thermalKW: number | null;
        deltaT: number | null;
      }>(),
  );
  const telemetryResults = telemetryRows.results ?? [];
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

  for (const row of telemetryResults) {
    const ts = Number(row.ts);
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((ts - sinceMs) / bucketMs)));
    const bucket = buckets[idx];
    bucket.count += 1;
    if (typeof row.cop === "number") bucket.cop += row.cop;
    if (typeof row.thermalKW === "number") bucket.thermal += row.thermalKW;
    if (typeof row.deltaT === "number") bucket.delta += row.deltaT;
  }

  const trendRaw: CachedTrendRow[] = buckets.map((bucket) => {
    const label = new Date(Math.min(nowMs, bucket.end)).toISOString();
    const count = bucket.count || 0;
    return {
      label,
      cop: count ? bucket.cop / count : null,
      thermalKW: count ? bucket.thermal / count : null,
      deltaT: count ? bucket.delta / count : null,
    };
  });

  const generatedAt = nowISO();
  const cachePayload: ClientCompactCachePayload = {
    version: CLIENT_COMPACT_CACHE_VERSION,
    generated_at: generatedAt,
    window_start_ms: sinceMs,
    kpis: {
      devices_total: devicesTotal,
      devices_online: devicesOnline,
      offline_count: offlineCount,
      online_pct: onlinePct,
      avg_cop: avgCop,
      low_deltaT_count: lowDeltaCount,
      open_alerts: openAlertsTotal,
      max_heartbeat_age_sec: maxHeartbeatAge,
    },
    alerts: alertBases,
    top_devices: topBases,
    trend: trendRaw,
  };

  if (scopeKey !== "empty") {
    await writeJsonCache(cacheKey, cachePayload, { ttlSeconds: cacheTtl, logger });
  }

  try {
    const responsePayload = await presentClientCompactResponse(cachePayload, env, scope, logger);
    return json(responsePayload);
  } catch (error) {
    logger.error("client.present_failed", { error });
    return json({ error: "Server error" }, { status: 500 });
  }
}

async function presentClientCompactResponse(
  payload: ClientCompactCachePayload,
  env: Env,
  scope: ReturnType<typeof buildDeviceScope>,
  logger: Logger,
) {
  if (scope.empty) {
    return {
      generated_at: payload.generated_at,
      scope: "empty" as const,
      window_start_ms: payload.window_start_ms,
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
    };
  }

  let alerts;
  try {
    alerts = await Promise.all(
      payload.alerts.map(async (entry) => ({
        device_id: presentDeviceId(entry.device_id, scope.isAdmin),
        lookup: await buildDeviceLookup(entry.device_id, env, scope.isAdmin),
        site: entry.site,
        ts: new Date(entry.ts).toISOString(),
        updated_at: entry.updated_at,
        faults: entry.faults,
        fault_count: entry.faults.length,
      })),
    );
  } catch (error) {
    logger.error("client.alerts_payload_failed", { error });
    throw error;
  }

  let topDevices;
  try {
    topDevices = await Promise.all(
      payload.top_devices.map(async (device) => ({
        device_id: presentDeviceId(device.device_id, scope.isAdmin),
        lookup: await buildDeviceLookup(device.device_id, env, scope.isAdmin),
        site: device.site,
        online: device.online,
        last_seen_at: device.last_seen_at,
        updated_at: device.updated_at,
        supplyC: maskTelemetryNumber(device.supplyC, scope.isAdmin, 1, 2),
        returnC: maskTelemetryNumber(device.returnC, scope.isAdmin, 1, 2),
        cop: maskTelemetryNumber(device.cop, scope.isAdmin, 1, 2),
        deltaT: maskTelemetryNumber(device.deltaT, scope.isAdmin, 1, 2),
        thermalKW: maskTelemetryNumber(device.thermalKW, scope.isAdmin, 1, 2),
        alert_count: device.faults.length,
      })),
    );
  } catch (error) {
    logger.error("client.top_devices_payload_failed", { error });
    throw error;
  }

  const trend = payload.trend.map((row) => ({
    label: row.label,
    cop: maskTelemetryNumber(row.cop, scope.isAdmin, 1, 2),
    thermalKW: maskTelemetryNumber(row.thermalKW, scope.isAdmin, 1, 2),
    deltaT: maskTelemetryNumber(row.deltaT, scope.isAdmin, 1, 2),
  }));

  return {
    generated_at: payload.generated_at,
    scope: scope.isAdmin ? ("fleet" as const) : ("tenant" as const),
    window_start_ms: payload.window_start_ms,
    kpis: {
      devices_total: payload.kpis.devices_total,
      devices_online: payload.kpis.devices_online,
      offline_count: payload.kpis.offline_count,
      online_pct: payload.kpis.online_pct,
      avg_cop: maskTelemetryNumber(payload.kpis.avg_cop, scope.isAdmin, 1, 2),
      low_deltaT_count: payload.kpis.low_deltaT_count,
      open_alerts: payload.kpis.open_alerts,
      max_heartbeat_age_sec: payload.kpis.max_heartbeat_age_sec,
    },
    alerts,
    top_devices: topDevices,
    trend,
  };
}
