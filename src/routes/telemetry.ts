import type { Env } from "../env";
import { requireAccessUser, userIsAdmin } from "../lib/access";
import {
  TelemetryLatestBatchSchema,
  TelemetrySeriesQuerySchema,
  TELEMETRY_ALLOWED_METRICS,
  type TelemetryLatestBatchInput,
} from "../schemas/telemetry";
import { nowISO } from "../utils";
import { json } from "../utils/responses";
import { loggerForRequest } from "../utils/logging";
import { validationErrorResponse, validateWithSchema } from "../utils/validation";
import {
  resolveLatestBatchDevices,
  presentLatestBatchRow,
  resolveTelemetrySeriesConfig,
} from "../lib/telemetry-access";
import {
  fetchLatestTelemetryBatch,
  fetchTelemetrySeries,
  type TelemetrySeriesRow,
} from "../lib/telemetry-store";
import { maskTelemetryNumber } from "../telemetry";
import {
  legacyHandleTelemetryLatestBatch,
  legacyHandleTelemetrySeries,
} from "./telemetry.legacy";

type TelemetryIncludeFlags = TelemetryLatestBatchInput["include"];
type TelemetryFeatureMode = "refactor" | "legacy" | "compare";

const METRICS_WITH_EXTENTS = new Set<Readonly<typeof TELEMETRY_ALLOWED_METRICS>[number]>([
  "deltaT",
  "thermalKW",
  "cop",
]);

export async function handleTelemetryLatestBatch(req: Request, env: Env, ctx?: ExecutionContext) {
  const mode = getTelemetryFeatureMode(env);
  if (mode === "legacy") {
    return legacyHandleTelemetryLatestBatch(req, env);
  }

  const shadowReq = mode === "compare" ? req.clone() : null;

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
  const resolution = await resolveLatestBatchDevices(env, user, body.devices);
  const { scope, requested, resolvedIds, missingTokens } = resolution;

  if (body.devices.length === 0) {
    const response = json({ generated_at: nowISO(), items: [], missing: [] });
    if (shadowReq) {
      scheduleShadowComparison(
        ctx,
        runLegacyShadowComparison(
          req as Request,
          shadowReq as Request,
          env,
          legacyHandleTelemetryLatestBatch,
          response.clone(),
          "/api/telemetry/latest-batch",
        ),
      );
    }
    return response;
  }

  if (scope.empty && !scope.isAdmin) {
    const response = json({
      generated_at: nowISO(),
      items: [],
      missing: [...new Set(body.devices)],
    });
    if (shadowReq) {
      scheduleShadowComparison(
        ctx,
        runLegacyShadowComparison(
          req as Request,
          shadowReq as Request,
          env,
          legacyHandleTelemetryLatestBatch,
          response.clone(),
          "/api/telemetry/latest-batch",
        ),
      );
    }
    return response;
  }

  if (!resolvedIds.length) {
    const response = json({
      generated_at: nowISO(),
      items: [],
      missing: dedupePreserveOrder(body.devices, missingTokens),
    });
    if (shadowReq) {
      scheduleShadowComparison(
        ctx,
        runLegacyShadowComparison(
          req as Request,
          shadowReq as Request,
          env,
          legacyHandleTelemetryLatestBatch,
          response.clone(),
          "/api/telemetry/latest-batch",
        ),
      );
    }
    return response;
  }

  const rows = await fetchLatestTelemetryBatch(env, resolvedIds, scope);
  const rowMap = new Map(rows.map((row) => [row.device_id, row]));
  const include: TelemetryIncludeFlags = body.include ?? { faults: true, metrics: true };
  const items: unknown[] = [];
  const seen = new Set<string>();
  const missingSet = new Set<string>(missingTokens);

  for (const entry of requested) {
    if (!entry.resolved) continue;
    if (seen.has(entry.resolved)) continue;
    const row = rowMap.get(entry.resolved);
    if (!row) {
      missingSet.add(entry.token);
      continue;
    }
    seen.add(entry.resolved);
    try {
      const formatted = await presentLatestBatchRow(row, env, include, user);
      items.push(formatted);
    } catch (error) {
      loggerForRequest(req, { route: "/api/telemetry/latest-batch" }).error(
        "telemetry.latest_batch.present_failed",
        { error, device_id: entry.resolved, mode },
      );
    }
  }

  const response = json({
    generated_at: nowISO(),
    items,
    missing: dedupePreserveOrder(body.devices, Array.from(missingSet)),
  });

  if (shadowReq) {
    scheduleShadowComparison(
      ctx,
      runLegacyShadowComparison(
        req as Request,
        shadowReq as Request,
        env,
        legacyHandleTelemetryLatestBatch,
        response.clone(),
        "/api/telemetry/latest-batch",
      ),
    );
  }

  return response;
}

export async function handleTelemetrySeries(req: Request, env: Env, ctx?: ExecutionContext) {
  const mode = getTelemetryFeatureMode(env);
  if (mode === "legacy") {
    return legacyHandleTelemetrySeries(req, env);
  }

  const shadowReq = mode === "compare" ? req.clone() : null;

  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rawQuery: Record<string, string | null> = {};
  const searchEntries = url.searchParams as any;
  for (const [key, value] of searchEntries) {
    rawQuery[key] = value;
  }
  const parsed = TelemetrySeriesQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }

  const result = await resolveTelemetrySeriesConfig(parsed.data, env, user);
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
  const rows = await fetchTelemetrySeries(env, config);

  const series = buildSeriesResponse(rows, {
    startMs: config.startMs,
    endMs: config.endMs,
    bucketMs: config.bucketMs,
    metrics: config.metrics,
    fillMode: config.fillMode,
    isAdmin: userIsAdmin(user),
    tenantPrecision: config.tenantPrecision,
  });

  const response = json({
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

  if (shadowReq) {
    scheduleShadowComparison(
      ctx,
      runLegacyShadowComparison(
        req as Request,
        shadowReq as Request,
        env,
        legacyHandleTelemetrySeries,
        response.clone(),
        "/api/telemetry/series",
      ),
    );
  }

  return response;
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

function buildSeriesResponse(rows: TelemetrySeriesRow[], options: BuildSeriesOptions) {
  const { startMs, endMs, bucketMs, metrics, fillMode, isAdmin, tenantPrecision } = options;

  const map = new Map<number, TelemetrySeriesRow>();
  for (const row of rows) {
    map.set(row.bucket_start_ms, row);
  }

  const startBucket = Math.floor(startMs / bucketMs) * bucketMs;
  const endBucket = Math.floor(endMs / bucketMs) * bucketMs;

  const buckets: TelemetrySeriesRow[] = [];

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

function captureLastValues(row: TelemetrySeriesRow) {
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
  row: TelemetrySeriesRow,
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

function averageForMetric(row: TelemetrySeriesRow, metric: typeof TELEMETRY_ALLOWED_METRICS[number]) {
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

function minForMetric(row: TelemetrySeriesRow, metric: typeof TELEMETRY_ALLOWED_METRICS[number]) {
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

function maxForMetric(row: TelemetrySeriesRow, metric: typeof TELEMETRY_ALLOWED_METRICS[number]) {
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

function dedupePreserveOrder(requested: string[], extra: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  const extraSet = new Set(extra);
  for (const token of requested) {
    if (extraSet.has(token) && !seen.has(token)) {
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

function getTelemetryFeatureMode(env: Env): TelemetryFeatureMode {
  const raw = String(env.TELEMETRY_REFACTOR_MODE ?? "").trim().toLowerCase();
  if (raw === "legacy" || raw === "off") {
    return "legacy";
  }
  if (raw === "compare" || raw === "shadow" || raw === "dark") {
    return "compare";
  }
  return "refactor";
}

function scheduleShadowComparison(ctx: ExecutionContext | undefined, work: Promise<void>) {
  if (ctx) {
    ctx.waitUntil(work);
  } else {
    void work;
  }
}

async function runLegacyShadowComparison(
  req: Request,
  legacyReq: Request,
  env: Env,
  handler: (request: Request, env: Env) => Promise<Response>,
  refactorResponse: Response,
  route: string,
) {
  try {
    const legacyResponse = await handler(legacyReq, env);
    await compareResponses(req, refactorResponse, legacyResponse, route);
  } catch (error) {
    loggerForRequest(req, { route }).warn("telemetry.refactor.shadow_failed", { error });
  }
}

async function compareResponses(
  req: Request,
  refactorResponse: Response,
  legacyResponse: Response,
  route: string,
) {
  try {
    const refactorBody = await extractBody(refactorResponse);
    const legacyBody = await extractBody(legacyResponse);
    const statusMismatch = refactorResponse.status !== legacyResponse.status;
    const bodyMismatch = !deepEqual(refactorBody, legacyBody);
    if (statusMismatch || bodyMismatch) {
      loggerForRequest(req, { route }).warn("telemetry.refactor.shadow_mismatch", {
        refactor_status: refactorResponse.status,
        legacy_status: legacyResponse.status,
        refactor_body: refactorBody,
        legacy_body: legacyBody,
      });
    }
  } catch (error) {
    loggerForRequest(req, { route }).warn("telemetry.refactor.shadow_compare_failed", { error });
  }
}

async function extractBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function deepEqual(lhs: unknown, rhs: unknown) {
  return JSON.stringify(lhs) === JSON.stringify(rhs);
}
