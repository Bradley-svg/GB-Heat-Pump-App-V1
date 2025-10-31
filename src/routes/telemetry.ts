import type { Env, User } from "../env";
import { requireAccessUser, userIsAdmin } from "../lib/access";
import {
  buildDeviceLookup,
  buildDeviceScope,
  presentDeviceId,
  resolveDeviceId,
} from "../lib/device";
import { maskTelemetryNumber } from "../telemetry";
import {
  TelemetryLatestBatchSchema,
  TelemetrySeriesQuerySchema,
  TELEMETRY_ALLOWED_METRICS,
  TELEMETRY_INTERVALS_MS,
  type TelemetryLatestBatchInput,
  type TelemetrySeriesQuery,
} from "../schemas/telemetry";
import { andWhere, nowISO, parseFaultsJson } from "../utils";
import { json } from "../utils/responses";
import { loggerForRequest } from "../utils/logging";
import { validationErrorResponse, validateWithSchema } from "../utils/validation";

type TelemetryIncludeFlags = TelemetryLatestBatchInput["include"];

const LATEST_BATCH_CHUNK = 100;
const METRICS_WITH_EXTENTS = new Set<Readonly<typeof TELEMETRY_ALLOWED_METRICS>[number]>([
  "deltaT",
  "thermalKW",
  "cop",
]);

interface LatestStateRow {
  device_id: string;
  ts: number | null;
  updated_at: string | null;
  supplyC: number | null;
  returnC: number | null;
  tankC: number | null;
  ambientC: number | null;
  flowLps: number | null;
  compCurrentA: number | null;
  eevSteps: number | null;
  powerKW: number | null;
  deltaT: number | null;
  thermalKW: number | null;
  cop: number | null;
  cop_quality: string | null;
  mode: string | null;
  defrost: number | null;
  latest_online: number | null;
  faults_json: string | null;
  payload_json: string | null;
  profile_id: string | null;
  site: string | null;
  device_online: number | null;
  last_seen_at: string | null;
}

interface SeriesRow {
  bucket_start_ms: number;
  sample_count: number;
  avg_deltaT: number | null;
  min_deltaT: number | null;
  max_deltaT: number | null;
  avg_thermalKW: number | null;
  min_thermalKW: number | null;
  max_thermalKW: number | null;
  avg_cop: number | null;
  min_cop: number | null;
  max_cop: number | null;
  avg_supplyC: number | null;
  avg_returnC: number | null;
  avg_flowLps: number | null;
  avg_powerKW: number | null;
}

export async function handleTelemetryLatestBatch(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validateWithSchema<TelemetryLatestBatchInput>(TelemetryLatestBatchSchema, payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.issues);
  }

  const body = parsed.data;
  const scope = buildDeviceScope(user);

  if (body.devices.length === 0) {
    return json({ generated_at: nowISO(), items: [], missing: [] });
  }

  if (scope.empty && !scope.isAdmin) {
    return json({
      generated_at: nowISO(),
      items: [],
      missing: [...new Set(body.devices)],
    });
  }

  const requested = body.devices.map((token, index) => ({
    token,
    index,
    resolved: null as string | null,
  }));

  const missing: string[] = [];
  for (const entry of requested) {
    const resolved = await resolveDeviceId(entry.token, env, scope.isAdmin);
    if (!resolved) {
      missing.push(entry.token);
      continue;
    }
    entry.resolved = resolved;
  }

  const resolvedIds = Array.from(
    new Set(requested.filter((r) => r.resolved).map((r) => r.resolved as string)),
  );

  if (!resolvedIds.length) {
    return json({
      generated_at: nowISO(),
      items: [],
      missing: dedupePreserveOrder(body.devices, missing),
    });
  }

  const rows = await fetchLatestRows(env, resolvedIds, scope);
  const rowMap = new Map<string, LatestStateRow>();
  for (const row of rows) {
    rowMap.set(row.device_id, row);
  }

  const items = [];
  const seen = new Set<string>();
  const missingTokens = new Set<string>(missing);

  for (const entry of requested) {
    if (!entry.resolved) {
      continue;
    }
    if (seen.has(entry.resolved)) {
      continue;
    }
    const row = rowMap.get(entry.resolved);
    if (!row) {
      missingTokens.add(entry.token);
      continue;
    }
    seen.add(entry.resolved);
    try {
      const formatted = await presentLatestRow(
        row,
        env,
        userIsAdmin(user),
        body.include ?? { faults: true, metrics: true },
      );
      items.push(formatted);
    } catch (error) {
      loggerForRequest(req, { route: "/api/telemetry/latest-batch" }).error(
        "telemetry.latest_batch.present_failed",
        { error, device_id: entry.resolved },
      );
    }
  }

  return json({
    generated_at: nowISO(),
    items,
    missing: dedupePreserveOrder(body.devices, Array.from(missingTokens)),
  });
}

export async function handleTelemetrySeries(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rawQuery: Record<string, string | null> = {};
  for (const [key, value] of url.searchParams.entries()) {
    rawQuery[key] = value;
  }
  const parsed = TelemetrySeriesQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const result = await resolveSeriesConfig(parsed.data, env, user);
  if (!result.ok) {
    if (result.status === 400) {
      return json({ error: result.error }, { status: 400 });
    }
    if (result.status === 403) {
      return json({ error: "Forbidden" }, { status: 403 });
    }
    if (result.status === 404) {
      return json({ error: "Not found" }, { status: 404 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }

  const { config } = result;
  const query = buildSeriesSql(config.whereClause);
  const bindings = [config.bucketMs, config.startMs, config.endMs, ...config.bindings];

  const rows = await env.DB.prepare(query).bind(...bindings).all<SeriesRow>();
  const bucketRows = rows.results ?? [];

  const series = buildSeriesResponse(bucketRows, {
    startMs: config.startMs,
    endMs: config.endMs,
    bucketMs: config.bucketMs,
    metrics: config.metrics,
    fillMode: config.fillMode,
    isAdmin: userIsAdmin(user),
    tenantPrecision: config.tenantPrecision,
  });

  return json({
    generated_at: nowISO(),
    scope: config.scopeDescriptor,
    interval_ms: config.bucketMs,
    window: {
      start: new Date(config.startMs).toISOString(),
      end: new Date(config.endMs).toISOString(),
    },
    metrics: config.metrics,
    series,
  });
}

interface SeriesConfig {
  bucketMs: number;
  startMs: number;
  endMs: number;
  metrics: (typeof TELEMETRY_ALLOWED_METRICS)[number][];
  whereClause: string;
  bindings: any[];
  scopeDescriptor: UnifiedScopeDescriptor;
  fillMode: "carry" | "none";
  tenantPrecision: number;
}

type SeriesConfigResult =
  | { ok: true; config: SeriesConfig }
  | { ok: false; status: 400 | 403 | 404 | 500; error: string };

interface DeviceScopeDescriptor {
  type: "device";
  device_id: string;
  lookup: string;
}

interface ProfileScopeDescriptor {
  type: "profile";
  profile_ids: string[];
}

interface FleetScopeDescriptor {
  type: "fleet";
  profile_ids: string[] | null;
}

type UnifiedScopeDescriptor = DeviceScopeDescriptor | ProfileScopeDescriptor | FleetScopeDescriptor;

async function resolveSeriesConfig(
  params: TelemetrySeriesQuery,
  env: Env,
  user: User,
): Promise<SeriesConfigResult> {
  const metrics = resolveMetrics(params.metric);
  if (!metrics.length) {
    return { ok: false, status: 400, error: "Invalid metrics" };
  }

  const bucketMs = resolveInterval(params.interval ?? "5m");
  if (!bucketMs) {
    return { ok: false, status: 400, error: "Invalid interval" };
  }

  const now = Date.now();
  const endMs = clampTimestamp(params.end, now);
  if (endMs === null) {
    return { ok: false, status: 400, error: "Invalid end timestamp" };
  }

  const defaultStart = endMs - 24 * 60 * 60 * 1000;
  let startMs = clampTimestamp(params.start, defaultStart);
  if (startMs === null) {
    return { ok: false, status: 400, error: "Invalid start timestamp" };
  }

  if (startMs >= endMs) {
    return { ok: false, status: 400, error: "Start must be before end" };
  }

  const limit = params.limit ?? 288;
  const maxWindow = limit * bucketMs;
  if (endMs - startMs > maxWindow) {
    startMs = endMs - maxWindow;
  }

  const scope = buildDeviceScope(user, "d");
  const isAdmin = scope.isAdmin;
  const fillMode = params.fill === "carry" ? "carry" : "none";
  const tenantPrecision = isAdmin ? 4 : 2;

  const conditions: string[] = ["t.ts BETWEEN params.start_ms AND params.end_ms"];
  const bindings: any[] = [];
  let scopeDescriptor: UnifiedScopeDescriptor;

  if (params.scope === "device") {
    if (!params.device) {
      return { ok: false, status: 400, error: "Device parameter is required for device scope" };
    }
    const resolvedId = await resolveDeviceId(params.device, env, isAdmin);
    if (!resolvedId) {
      return { ok: false, status: 404, error: "Device not found" };
    }

    const row = await env.DB
      .prepare(`SELECT device_id, profile_id FROM devices WHERE device_id = ?1 LIMIT 1`)
      .bind(resolvedId)
      .first<{ device_id: string; profile_id: string | null }>();
    if (!row) {
      return { ok: false, status: 404, error: "Device not found" };
    }

    if (!isAdmin) {
      const allowed = (scope.bind as string[]) ?? [];
      if (!allowed.includes(row.profile_id ?? "")) {
        return { ok: false, status: 403, error: "Forbidden" };
      }
    }

    conditions.push("t.device_id = ?");
    bindings.push(row.device_id);

    const outwardId = presentDeviceId(row.device_id, isAdmin);
    const lookup = await buildDeviceLookup(row.device_id, env, isAdmin);
    scopeDescriptor = { type: "device", device_id: outwardId, lookup };
  } else if (params.scope === "profile") {
    if (isAdmin) {
      if (!params.profile) {
        return { ok: false, status: 400, error: "Profile parameter is required for profile scope" };
      }
      const clause = buildInClause("d.profile_id", [params.profile]);
      conditions.push(clause);
      bindings.push(params.profile);
      scopeDescriptor = { type: "profile", profile_ids: [params.profile] };
    } else {
      const allowed = (scope.bind as string[]) ?? [];
      if (!allowed.length) {
        conditions.push("1=0");
        scopeDescriptor = { type: "profile", profile_ids: [] };
      } else {
        let selected: string[];
        if (params.profile) {
          if (!allowed.includes(params.profile)) {
            return { ok: false, status: 403, error: "Forbidden" };
          }
          selected = [params.profile];
        } else if (allowed.length === 1) {
          selected = [...allowed];
        } else {
          return { ok: false, status: 400, error: "Profile parameter required for scoped users" };
        }
        const clause = buildInClause("d.profile_id", selected);
        conditions.push(clause);
        bindings.push(...selected);
        scopeDescriptor = { type: "profile", profile_ids: selected };
      }
    }
  } else {
    // fleet scope
    if (isAdmin) {
      if (params.profile) {
        const clause = buildInClause("d.profile_id", [params.profile]);
        conditions.push(clause);
        bindings.push(params.profile);
        scopeDescriptor = { type: "fleet", profile_ids: [params.profile] };
      } else {
        scopeDescriptor = { type: "fleet", profile_ids: null };
      }
    } else {
      const allowed = (scope.bind as string[]) ?? [];
      if (!allowed.length) {
        conditions.push("1=0");
        scopeDescriptor = { type: "fleet", profile_ids: [] };
      } else {
        let selected = [...allowed];
        if (params.profile) {
          if (!allowed.includes(params.profile)) {
            return { ok: false, status: 403, error: "Forbidden" };
          }
          selected = [params.profile];
        }
        const clause = buildInClause("d.profile_id", selected);
        conditions.push(clause);
        bindings.push(...selected);
        scopeDescriptor = { type: "fleet", profile_ids: selected };
      }
    }
  }

  if (!isAdmin && scope.clause) {
    conditions.push(scope.clause);
    bindings.push(...scope.bind);
  }

  const whereClause = conditions.join(" AND ");

  return {
    ok: true,
    config: {
      bucketMs,
      startMs,
      endMs,
      metrics,
      whereClause,
      bindings,
      scopeDescriptor,
      fillMode,
      tenantPrecision,
    },
  };
}

function resolveMetrics(csv: string | undefined | null) {
  if (!csv) return TELEMETRY_ALLOWED_METRICS;
  const parts = csv
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean) as (typeof TELEMETRY_ALLOWED_METRICS)[number][];
  const allowed = new Set(TELEMETRY_ALLOWED_METRICS);
  return parts.filter((part) => allowed.has(part));
}

function resolveInterval(interval: string | undefined) {
  if (!interval) return TELEMETRY_INTERVALS_MS["5m"];
  return TELEMETRY_INTERVALS_MS[interval] ?? null;
}

function clampTimestamp(value: string | number | null | undefined, fallback: number): number | null {
  if (value == null) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (!trimmed) return fallback;
  if (/^\d+$/.test(trimmed)) {
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildInClause(column: string, values: string[]) {
  if (!values.length) return "1=0";
  const placeholders = values.map(() => "?").join(",");
  return `${column} IN (${placeholders})`;
}

function buildSeriesSql(whereClause: string) {
  return `
    WITH params AS (
      SELECT ? AS bucket_ms, ? AS start_ms, ? AS end_ms
    ),
    scoped AS (
      SELECT
        (CAST(t.ts / params.bucket_ms AS INTEGER) * params.bucket_ms) AS bucket_start_ms,
        t.device_id,
        t.deltaT,
        t.thermalKW,
        t.cop,
        json_extract(t.metrics_json, '$.supplyC') AS supplyC,
        json_extract(t.metrics_json, '$.returnC') AS returnC,
        json_extract(t.metrics_json, '$.flowLps') AS flowLps,
        json_extract(t.metrics_json, '$.powerKW') AS powerKW
      FROM telemetry t
      JOIN devices d ON d.device_id = t.device_id
      JOIN params
      WHERE ${whereClause}
    ),
    per_device AS (
      SELECT
        bucket_start_ms,
        device_id,
        COUNT(*) AS sample_count,
        AVG(deltaT) AS avg_deltaT,
        MIN(deltaT) AS min_deltaT,
        MAX(deltaT) AS max_deltaT,
        AVG(thermalKW) AS avg_thermalKW,
        MIN(thermalKW) AS min_thermalKW,
        MAX(thermalKW) AS max_thermalKW,
        AVG(cop) AS avg_cop,
        MIN(cop) AS min_cop,
        MAX(cop) AS max_cop,
        AVG(supplyC) AS avg_supplyC,
        AVG(returnC) AS avg_returnC,
        AVG(flowLps) AS avg_flowLps,
        AVG(powerKW) AS avg_powerKW
      FROM scoped
      GROUP BY bucket_start_ms, device_id
    ),
    aggregated AS (
      SELECT
        bucket_start_ms,
        SUM(sample_count) AS sample_count,
        AVG(avg_deltaT) AS avg_deltaT,
        MIN(min_deltaT) AS min_deltaT,
        MAX(max_deltaT) AS max_deltaT,
        AVG(avg_thermalKW) AS avg_thermalKW,
        MIN(min_thermalKW) AS min_thermalKW,
        MAX(max_thermalKW) AS max_thermalKW,
        AVG(avg_cop) AS avg_cop,
        MIN(min_cop) AS min_cop,
        MAX(max_cop) AS max_cop,
        AVG(avg_supplyC) AS avg_supplyC,
        AVG(avg_returnC) AS avg_returnC,
        AVG(avg_flowLps) AS avg_flowLps,
        AVG(avg_powerKW) AS avg_powerKW
      FROM per_device
      GROUP BY bucket_start_ms
    )
    SELECT *
    FROM aggregated
    ORDER BY bucket_start_ms ASC
  `;
}

async function fetchLatestRows(
  env: Env,
  deviceIds: string[],
  scope: ReturnType<typeof buildDeviceScope>,
) {
  const rows: LatestStateRow[] = [];
  for (let i = 0; i < deviceIds.length; i += LATEST_BATCH_CHUNK) {
    const chunk = deviceIds.slice(i, i + LATEST_BATCH_CHUNK);
    const placeholders = chunk.map(() => "?").join(",");
    let where = `ls.device_id IN (${placeholders})`;
    const bind: any[] = [...chunk];

    if (!scope.isAdmin && scope.clause) {
      where = andWhere(where, scope.clause.replace(/^WHERE\s+/i, ""));
      bind.push(...scope.bind);
    }

    const query = `
      SELECT
        ls.device_id,
        ls.ts,
        ls.updated_at,
        ls.supplyC,
        ls.returnC,
        ls.tankC,
        ls.ambientC,
        ls.flowLps,
        ls.compCurrentA,
        ls.eevSteps,
        ls.powerKW,
        ls.deltaT,
        ls.thermalKW,
        ls.cop,
        ls.cop_quality,
        ls.mode,
        ls.defrost,
        ls.online AS latest_online,
        ls.faults_json,
        ls.payload_json,
        d.profile_id,
        d.site,
        d.online AS device_online,
        d.last_seen_at
      FROM latest_state ls
      JOIN devices d ON d.device_id = ls.device_id
      WHERE ${where}
    `;

    const result = await env.DB.prepare(query).bind(...bind).all<LatestStateRow>();
    rows.push(...(result.results ?? []));
  }
  return rows;
}

async function presentLatestRow(
  row: LatestStateRow,
  env: Env,
  isAdmin: boolean,
  include: TelemetryIncludeFlags,
) {
  const lookup = await buildDeviceLookup(row.device_id, env, isAdmin);
  const outwardId = presentDeviceId(row.device_id, isAdmin);
  const payload = safeParseJson(row.payload_json);
  const latest: Record<string, unknown> = {
    ts: row.ts ?? null,
    updated_at: row.updated_at ?? null,
    online: row.latest_online === 1,
    mode: row.mode ?? null,
    defrost: row.defrost ?? null,
    cop_quality: row.cop_quality ?? null,
    payload,
  };

  if (include.metrics !== false) {
    latest.supplyC = maskTelemetryNumber(row.supplyC, isAdmin);
    latest.returnC = maskTelemetryNumber(row.returnC, isAdmin);
    latest.tankC = maskTelemetryNumber(row.tankC, isAdmin);
    latest.ambientC = maskTelemetryNumber(row.ambientC, isAdmin);
    latest.flowLps = maskTelemetryNumber(row.flowLps, isAdmin, 3);
    latest.compCurrentA = maskTelemetryNumber(row.compCurrentA, isAdmin, 2);
    latest.eevSteps = maskTelemetryNumber(row.eevSteps, isAdmin, 0);
    latest.powerKW = maskTelemetryNumber(row.powerKW, isAdmin, 3);
    latest.deltaT = maskTelemetryNumber(row.deltaT, isAdmin, 2);
    latest.thermalKW = maskTelemetryNumber(row.thermalKW, isAdmin, 3);
    latest.cop = maskTelemetryNumber(row.cop, isAdmin, 2);
  }

  if (include.faults !== false) {
    latest.faults = parseFaultsJson(row.faults_json);
  }

  return {
    lookup,
    device_id: outwardId,
    profile_id: row.profile_id ?? null,
    site: row.site ?? null,
    online: row.device_online === 1,
    last_seen_at: row.last_seen_at ?? null,
    latest,
  };
}
interface BuildSeriesOptions {
  startMs: number;
  endMs: number;
  bucketMs: number;
  metrics: readonly (typeof TELEMETRY_ALLOWED_METRICS)[number][];
  fillMode: "carry" | "none";
  isAdmin: boolean;
  tenantPrecision: number;
}

function buildSeriesResponse(rows: SeriesRow[], options: BuildSeriesOptions) {
  const { startMs, endMs, bucketMs, metrics, fillMode, isAdmin, tenantPrecision } = options;

  const map = new Map<number, SeriesRow>();
  for (const row of rows) {
    map.set(row.bucket_start_ms, row);
  }

  const startBucket = Math.floor(startMs / bucketMs) * bucketMs;
  const endBucket = Math.floor(endMs / bucketMs) * bucketMs;

  const buckets: SeriesRow[] = [];

  if (fillMode === "carry") {
    let current = startBucket;
    let lastValues: Record<string, number | null> | null = null;

    while (current <= endBucket) {
      const row = map.get(current);
      if (row) {
        buckets.push(row);
        lastValues = captureLastValues(row);
      } else if (lastValues) {
        buckets.push({
          bucket_start_ms: current,
          sample_count: 0,
          avg_deltaT: lastValues.deltaT,
          min_deltaT: lastValues.deltaT,
          max_deltaT: lastValues.deltaT,
          avg_thermalKW: lastValues.thermalKW,
          min_thermalKW: lastValues.thermalKW,
          max_thermalKW: lastValues.thermalKW,
          avg_cop: lastValues.cop,
          min_cop: lastValues.cop,
          max_cop: lastValues.cop,
          avg_supplyC: lastValues.supplyC,
          avg_returnC: lastValues.returnC,
          avg_flowLps: lastValues.flowLps,
          avg_powerKW: lastValues.powerKW,
        });
      }
      current += bucketMs;
    }
  } else {
    buckets.push(...rows);
  }

  return buckets.map((row) => ({
    bucket_start: new Date(row.bucket_start_ms).toISOString(),
    sample_count: row.sample_count,
    values: buildMetricValues(row, metrics, isAdmin, tenantPrecision),
  }));
}

function captureLastValues(row: SeriesRow) {
  return {
    deltaT: row.avg_deltaT,
    thermalKW: row.avg_thermalKW,
    cop: row.avg_cop,
    supplyC: row.avg_supplyC,
    returnC: row.avg_returnC,
    flowLps: row.avg_flowLps,
    powerKW: row.avg_powerKW,
  };
}

function buildMetricValues(
  row: SeriesRow,
  metrics: readonly (typeof TELEMETRY_ALLOWED_METRICS)[number][],
  isAdmin: boolean,
  tenantPrecision: number,
) {
  const values: Record<string, Record<string, number | null>> = {};
  for (const metric of metrics) {
    const entry: Record<string, number | null> = {};
    const avg = averageForMetric(row, metric);
    entry.avg = maskTelemetryNumber(avg, isAdmin, tenantPrecision, 4);

    if (METRICS_WITH_EXTENTS.has(metric)) {
      const minVal = minForMetric(row, metric);
      const maxVal = maxForMetric(row, metric);
      entry.min = maskTelemetryNumber(minVal, isAdmin, tenantPrecision, 4);
      entry.max = maskTelemetryNumber(maxVal, isAdmin, tenantPrecision, 4);
    }

    values[metric] = entry;
  }
  return values;
}

function averageForMetric(row: SeriesRow, metric: typeof TELEMETRY_ALLOWED_METRICS[number]) {
  switch (metric) {
    case "deltaT":
      return row.avg_deltaT;
    case "thermalKW":
      return row.avg_thermalKW;
    case "cop":
      return row.avg_cop;
    case "supplyC":
      return row.avg_supplyC;
    case "returnC":
      return row.avg_returnC;
    case "flowLps":
      return row.avg_flowLps;
    case "powerKW":
      return row.avg_powerKW;
    default:
      return null;
  }
}

function minForMetric(row: SeriesRow, metric: typeof TELEMETRY_ALLOWED_METRICS[number]) {
  switch (metric) {
    case "deltaT":
      return row.min_deltaT;
    case "thermalKW":
      return row.min_thermalKW;
    case "cop":
      return row.min_cop;
    default:
      return null;
  }
}

function maxForMetric(row: SeriesRow, metric: typeof TELEMETRY_ALLOWED_METRICS[number]) {
  switch (metric) {
    case "deltaT":
      return row.max_deltaT;
    case "thermalKW":
      return row.max_thermalKW;
    case "cop":
      return row.max_cop;
    default:
      return null;
  }
}

function safeParseJson(payload: string | null | undefined) {
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function dedupePreserveOrder(requested: string[], extra: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const token of requested) {
    if (extra.includes(token) && !seen.has(token)) {
      seen.add(token);
      output.push(token);
    }
  }
  for (const token of extra) {
    if (!seen.has(token)) {
      seen.add(token);
      output.push(token);
    }
  }
  return output;
}
