import type { Env } from "../env";
import type { buildDeviceScope } from "./device";
import { andWhere } from "../utils";

export const TELEMETRY_LATEST_BATCH_CHUNK = 100;

export type DeviceScope = ReturnType<typeof buildDeviceScope>;

export interface TelemetryLatestRow {
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

export interface TelemetrySeriesRow {
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

export interface TelemetrySeriesQueryConfig {
  bucketMs: number;
  startMs: number;
  endMs: number;
  whereClause: string;
  bindings: readonly unknown[];
}

export async function fetchLatestTelemetryBatch(
  env: Env,
  deviceIds: string[],
  scope: DeviceScope,
): Promise<TelemetryLatestRow[]> {
  if (!deviceIds.length) {
    return [];
  }

  const rows: TelemetryLatestRow[] = [];
  for (let i = 0; i < deviceIds.length; i += TELEMETRY_LATEST_BATCH_CHUNK) {
    const chunk = deviceIds.slice(i, i + TELEMETRY_LATEST_BATCH_CHUNK);
    const placeholders = chunk.map(() => "?").join(",");
    let where = `ls.device_id IN (${placeholders})`;
    const bind: unknown[] = [...chunk];

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

    const result = await env.DB.prepare(query).bind(...bind).all<TelemetryLatestRow>();
    rows.push(...(result.results ?? []));
  }

  return rows;
}

export async function fetchTelemetrySeries(
  env: Env,
  config: TelemetrySeriesQueryConfig,
): Promise<TelemetrySeriesRow[]> {
  const query = buildSeriesSql(config.whereClause);
  const bindings = [config.bucketMs, config.startMs, config.endMs, ...config.bindings];
  const rows = await env.DB.prepare(query).bind(...bindings).all<TelemetrySeriesRow>();
  return rows.results ?? [];
}

function buildSeriesSql(whereClause: string): string {
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
