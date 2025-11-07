import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { buildDeviceLookup, buildDeviceScope, presentDeviceId } from "../lib/device";
import { readJsonCache, writeJsonCache } from "../lib/cache";
import { json } from "../utils/responses";
import { andWhere, nowISO, parseFaultsJson } from "../utils";
import { ArchiveQuerySchema } from "../schemas/archive";
import { validationErrorResponse } from "../utils/validation";
import { maskTelemetryNumber } from "../telemetry";
import { loggerForRequest, type Logger } from "../utils/logging";
import {
  DASHBOARD_CACHE_AREA,
  getDashboardTokenSignature,
  scopeIdsForProfiles,
} from "../lib/dashboard-cache";

const ARCHIVE_CACHE_VERSION = 1;
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

function resolveProfileThreshold(env: Env): number {
  return parsePositiveInt(env.CLIENT_QUERY_PROFILE_THRESHOLD_MS, 50);
}

function resolveScopeCacheKey(scope: ReturnType<typeof buildDeviceScope>): string {
  if (scope.isAdmin) return "admin";
  if (scope.empty) return "empty";
  if (!scope.bind || scope.bind.length === 0) return "tenant:none";
  const tokens = scope.bind.map((value) => String(value)).sort();
  return `tenant:${tokens.join(",")}`;
}

function buildArchiveCacheKey(
  scopeKey: string,
  tokenSignature: string,
  offlineHours: number,
  days: number,
): string {
  return `archive:v${ARCHIVE_CACHE_VERSION}:t${tokenSignature}:${scopeKey}:h${offlineHours}:d${days}`;
}

function resolveArchiveCacheTtl(env: Env): number {
  return parsePositiveInt(env.ARCHIVE_CACHE_TTL_SECS, 60);
}

interface QueryProfiler {
  run<T>(label: string, fn: () => Promise<T>): Promise<T>;
}

function createQueryProfiler(env: Env, logger: Logger): QueryProfiler {
  if (!shouldProfileQueries(env)) {
    return { run: (_label, fn) => fn() };
  }
  const threshold = resolveProfileThreshold(env);
  return {
    async run<T>(label: string, fn: () => Promise<T>): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - start;
        if (duration >= threshold) {
          logger.debug("archive.query_profile", { label, duration_ms: duration });
        }
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.warn("archive.query_profile_failed", { label, duration_ms: duration, error });
        throw error;
      }
    },
  };
}

type FaultEntry = ReturnType<typeof parseFaultsJson>[number];

interface CachedOfflineRow {
  device_id: string;
  site: string | null;
  last_seen_at: string | null;
  online: boolean;
  cop: number | null;
  deltaT: number | null;
  thermalKW: number | null;
  updated_at: string | null;
  faults: FaultEntry[];
}

interface CachedHistoryRow {
  day: string;
  samples: number;
}

interface ArchiveCachePayload {
  version: number;
  generated_at: string;
  offline: CachedOfflineRow[];
  history: CachedHistoryRow[];
}

export async function handleArchive(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const logger = loggerForRequest(req, { route: "/api/archive/offline" });
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

  const scopeKey = resolveScopeCacheKey(scope);
  const profileIds =
    scope.isAdmin || scope.empty ? [] : (scope.bind ?? []).map((value) => String(value));
  const scopeIds = scopeIdsForProfiles(profileIds);
  const tokenSignature = await getDashboardTokenSignature(
    env,
    DASHBOARD_CACHE_AREA.archiveOffline,
    scopeIds,
  );
  const cacheKey = buildArchiveCacheKey(scopeKey, tokenSignature, offlineHours, days);
  const cacheTtl = resolveArchiveCacheTtl(env);

  if (scopeKey !== "empty") {
    const cached = await readJsonCache<ArchiveCachePayload>(cacheKey, { logger });
    if (cached && cached.version === ARCHIVE_CACHE_VERSION) {
      try {
        const responsePayload = await presentArchiveResponse(cached, env, scope, logger);
        return json(responsePayload);
      } catch (error) {
        logger.error("archive.cache_present_failed", { error });
        return json({ error: "Server error" }, { status: 500 });
      }
    }
  }

  const profiler = createQueryProfiler(env, logger);

  const offlineWhere = andWhere(where, "(d.last_seen_at IS NULL OR d.last_seen_at < ?)");
  const offlineRows = await profiler.run("archive.offline", () =>
    env.DB
      .prepare(
        `SELECT d.device_id,
                d.site,
                d.last_seen_at,
                d.online,
                ls.cop,
                ls.deltaT,
                ls.thermalKW,
                ls.faults_json,
                ls.updated_at
           FROM devices d
           LEFT JOIN latest_state ls ON ls.device_id = d.device_id
           ${offlineWhere}
          ORDER BY d.last_seen_at IS NOT NULL,
                   d.last_seen_at ASC
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
        thermalKW: number | null;
        faults_json: string | null;
        updated_at: string | null;
      }>(),
  );
  const offlineBases: CachedOfflineRow[] = (offlineRows.results ?? []).map((row) => ({
    device_id: row.device_id,
    site: row.site ?? null,
    last_seen_at: row.last_seen_at ?? null,
    online: Boolean(row.online),
    cop: row.cop ?? null,
    deltaT: row.deltaT ?? null,
    thermalKW: row.thermalKW ?? null,
    updated_at: row.updated_at ?? null,
    faults: parseFaultsJson(row.faults_json),
  }));

  const historyWhere = andWhere(andWhere(where, "t.ts >= ?"), "t.ts IS NOT NULL");
  const historyRows = await profiler.run("archive.history", () =>
    env.DB
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
      .all<{ day: string; samples: number | string }>(),
  );
  const historyBases: CachedHistoryRow[] = (historyRows.results ?? []).map((row) => ({
    day: row.day,
    samples: Number(row.samples ?? 0),
  }));

  const cachePayload: ArchiveCachePayload = {
    version: ARCHIVE_CACHE_VERSION,
    generated_at: nowISO(),
    offline: offlineBases,
    history: historyBases,
  };

  if (scopeKey !== "empty") {
    await writeJsonCache(cacheKey, cachePayload, { ttlSeconds: cacheTtl, logger });
  }

  try {
    const responsePayload = await presentArchiveResponse(cachePayload, env, scope, logger);
    return json(responsePayload);
  } catch (error) {
    logger.error("archive.present_failed", { error });
    return json({ error: "Server error" }, { status: 500 });
  }
}

async function presentArchiveResponse(
  payload: ArchiveCachePayload,
  env: Env,
  scope: ReturnType<typeof buildDeviceScope>,
  logger: Logger,
) {
  let offline;
  try {
    offline = await Promise.all(
      payload.offline.map(async (row) => ({
        device_id: presentDeviceId(row.device_id, scope.isAdmin),
        lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
        site: row.site,
        last_seen_at: row.last_seen_at,
        online: row.online,
        cop: maskTelemetryNumber(row.cop, scope.isAdmin, 1, 2),
        deltaT: maskTelemetryNumber(row.deltaT, scope.isAdmin, 1, 2),
        alerts: row.faults.length,
        updated_at: row.updated_at,
      })),
    );
  } catch (error) {
    logger.error("archive.offline_payload_failed", { error });
    throw error;
  }

  const history = payload.history.map((row) => ({
    day: row.day,
    samples: row.samples,
  }));

  return {
    generated_at: payload.generated_at,
    offline,
    history,
  };
}
