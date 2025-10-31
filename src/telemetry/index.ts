import { nowISO, round } from "../utils";

export type MetricsFormat = "prom" | "json";

export interface DerivationInput {
  supplyC?: number | null;
  returnC?: number | null;
  flowLps?: number | null;
  powerKW?: number | null;
}

export interface DerivedMetrics {
  deltaT: number | null;
  thermalKW: number | null;
  cop: number | null;
  cop_quality: "measured" | null;
}

export interface DeviceSummaryInput {
  total: number | null | undefined;
  online: number | null | undefined;
}

export interface OpsMetricInput {
  route: string | null;
  status_code: number | null;
  count: number | null;
}

export interface OpsMetricNormalized {
  route: string;
  status_code: number;
  count: number;
}

const WATER_DENSITY_KG_PER_L = 0.997;
const WATER_SPECIFIC_HEAT_KJ_PER_KG_C = 4.186;
const MIN_COP_POWER_KW = 0.05;

export function pickMetricsFormat(explicit: string | null | undefined, acceptHeader: string | null | undefined): MetricsFormat {
  if (explicit === "json" || explicit === "prom") return explicit;
  if (typeof acceptHeader === "string" && acceptHeader.toLowerCase().includes("application/json")) {
    return "json";
  }
  return "prom";
}

export function deriveDeltaT(supplyC: unknown, returnC: unknown): number | null {
  if (typeof supplyC !== "number" || typeof returnC !== "number") return null;
  return round(supplyC - returnC, 1);
}

export function deriveThermalKW(deltaT: number | null, flowLps: unknown): number | null {
  if (deltaT === null || typeof flowLps !== "number") return null;
  return round(WATER_DENSITY_KG_PER_L * WATER_SPECIFIC_HEAT_KJ_PER_KG_C * flowLps * deltaT, 2);
}

export function deriveCop(thermalKW: number | null, powerKW: unknown): { cop: number | null; quality: "measured" | null } {
  if (thermalKW === null || typeof powerKW !== "number" || powerKW <= MIN_COP_POWER_KW) {
    return { cop: null, quality: null };
  }
  return {
    cop: round(thermalKW / powerKW, 2),
    quality: "measured",
  };
}

export function deriveTelemetryMetrics(input: DerivationInput): DerivedMetrics {
  const deltaT = deriveDeltaT(input.supplyC ?? null, input.returnC ?? null);
  const thermalKW = deriveThermalKW(deltaT, input.flowLps ?? null);
  const copInfo = deriveCop(thermalKW, input.powerKW ?? null);
  return {
    deltaT,
    thermalKW,
    cop: copInfo.cop,
    cop_quality: copInfo.quality,
  };
}

export function maskTelemetryNumber(
  value: unknown,
  isAdmin: boolean,
  tenantPrecision = 1,
  adminPrecision?: number,
): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (isAdmin) {
    return typeof adminPrecision === "number" ? Number(value.toFixed(adminPrecision)) : value;
  }
  return Number(value.toFixed(tenantPrecision));
}

export function normalizeDeviceSummary(stats: DeviceSummaryInput) {
  const total = Number.isFinite(stats.total as number) ? (stats.total as number) : 0;
  const online = Number.isFinite(stats.online as number) ? (stats.online as number) : 0;
  const offline = Math.max(0, total - online);
  return { total, online, offline };
}

export function normalizeOpsMetrics(rows: OpsMetricInput[]): OpsMetricNormalized[] {
  return rows.map((row) => ({
    route: row.route ?? "unknown",
    status_code: typeof row.status_code === "number" ? row.status_code : 0,
    count: typeof row.count === "number" ? row.count : 0,
  }));
}

export function formatMetricsJson(
  devices: DeviceSummaryInput,
  opsRows: OpsMetricInput[],
  generatedAt: string = nowISO(),
) {
  const summary = normalizeDeviceSummary(devices);
  const ops = normalizeOpsMetrics(opsRows);
  return {
    devices: summary,
    ops,
    generated_at: generatedAt,
  };
}

export function formatPromMetrics(
  devices: DeviceSummaryInput,
  opsRows: OpsMetricInput[],
  timestampMs: number = Date.now(),
) {
  const summary = normalizeDeviceSummary(devices);
  const ops = normalizeOpsMetrics(opsRows);
  const lines: string[] = [
    "# HELP greenbro_devices_total Total registered devices",
    "# TYPE greenbro_devices_total gauge",
    `greenbro_devices_total ${summary.total}`,
    "# HELP greenbro_devices_online_total Devices currently marked online",
    "# TYPE greenbro_devices_online_total gauge",
    `greenbro_devices_online_total ${summary.online}`,
    "# HELP greenbro_devices_offline_total Devices currently marked offline",
    "# TYPE greenbro_devices_offline_total gauge",
    `greenbro_devices_offline_total ${summary.offline}`,
    "# HELP greenbro_ops_requests_total Recorded API requests by route and status",
    "# TYPE greenbro_ops_requests_total counter",
  ];

  for (const row of ops) {
    const routeLabel = row.route.replace(/"/g, '\\"');
    lines.push(
      `greenbro_ops_requests_total{route="${routeLabel}",status="${row.status_code}"} ${row.count}`,
    );
  }

  lines.push(
    "# HELP greenbro_metrics_generated_at Timestamp metrics payload produced",
    "# TYPE greenbro_metrics_generated_at gauge",
  );
  lines.push(`greenbro_metrics_generated_at ${Math.floor(timestampMs / 1000)}`);

  return lines.join("\n") + "\n";
}
