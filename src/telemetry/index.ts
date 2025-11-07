import { nowISO, round } from "../utils";
import type { SignupFunnelSummary } from "../lib/signup-funnel";
import { SIGNUP_FUNNEL_WINDOW_DAYS } from "../lib/signup-funnel";

export type MetricsFormat = "prom" | "json";

type SeverityLevel = "ok" | "warn" | "critical";

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
  total_duration_ms?: number | string | null;
  avg_duration_ms?: number | string | null;
  max_duration_ms?: number | string | null;
}

export interface OpsMetricNormalized {
  route: string;
  status_code: number;
  count: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  max_duration_ms: number;
}

export interface SignupMetricsPayload extends SignupFunnelSummary {
  status: SeverityLevel;
  thresholds: typeof ALERT_THRESHOLDS.signup;
}

const WATER_DENSITY_KG_PER_L = 0.997;
const WATER_SPECIFIC_HEAT_KJ_PER_KG_C = 4.186;
const MIN_COP_POWER_KW = 0.05;

export const ALERT_THRESHOLDS = {
  devices: {
    offline_ratio: { warn: 0.2, critical: 0.35 },
    heartbeat_gap_minutes: { warn: 5, critical: 10 },
  },
  ops: {
    error_rate: { warn: 0.02, critical: 0.05 },
    client_error_rate: { warn: 0.08, critical: 0.15 },
    avg_duration_ms: { warn: 1500, critical: 3000 },
  },
  ingest: {
    consecutive_failures: { warn: 3, critical: 5 },
    rate_limit_per_device: { warn: 90, critical: 120 },
  },
  signup: {
    conversion_rate: { warn: 0.45, critical: 0.25 },
    pending_ratio: { warn: 0.35, critical: 0.55 },
    error_rate: { warn: 0.2, critical: 0.35 },
    resend_error_rate: { warn: 0.2, critical: 0.4 },
    pending_logout_failures: { warn: 5, critical: 15 },
  },
} as const;

function coerceNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

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
  return rows.map((row) => {
    const route = row.route ?? "unknown";
    const statusCodeRaw =
      typeof row.status_code === "number" ? row.status_code : coerceNumber(row.status_code);
    const statusCode = Number.isFinite(statusCodeRaw) ? Math.trunc(statusCodeRaw) : 0;
    const count = coerceNumber(row.count);
    const totalDuration = coerceNumber(row.total_duration_ms);
    const avgDuration =
      count > 0 ? totalDuration / count : coerceNumber(row.avg_duration_ms);
    const maxDuration = coerceNumber(row.max_duration_ms);

    return {
      route,
      status_code: statusCode,
      count,
      total_duration_ms: totalDuration,
      avg_duration_ms: avgDuration,
      max_duration_ms: maxDuration,
    };
  });
}

function normalizeSignupSummary(
  summary: SignupFunnelSummary | undefined,
  generatedAt: string,
): SignupMetricsPayload {
  const base: SignupFunnelSummary =
    summary ??
    {
      window_start: generatedAt,
      window_days: SIGNUP_FUNNEL_WINDOW_DAYS,
      submissions: 0,
      authenticated: 0,
      pending: 0,
      errors: 0,
      conversion_rate: 0,
      pending_ratio: 0,
      error_rate: 0,
      resend_requests: 0,
      resend_success: 0,
      resend_errors: 0,
      resend_error_rate: 0,
      resend_status_counts: {},
      pending_logout_failures: 0,
    };

  const submissions = Math.max(0, base.submissions ?? 0);
  const authenticated = Math.max(0, base.authenticated ?? 0);
  const pending = Math.max(0, base.pending ?? 0);
  const errors = Math.max(0, base.errors ?? 0);
  const resendRequests = Math.max(0, base.resend_requests ?? 0);
  const resendSuccess = Math.max(0, base.resend_success ?? 0);
  const resendErrors = Math.max(0, base.resend_errors ?? 0);
  const pendingLogoutFailures = Math.max(0, base.pending_logout_failures ?? 0);
  const resendStatusCounts = base.resend_status_counts ?? {};

  const conversionRate =
    submissions > 0 ? authenticated / submissions : base.conversion_rate ?? 0;
  const pendingRatio =
    submissions > 0 ? pending / submissions : base.pending_ratio ?? (pending > 0 ? 1 : 0);
  const errorRate =
    submissions > 0 ? errors / submissions : base.error_rate ?? (errors > 0 ? 1 : 0);
  const resendErrorRate =
    resendRequests > 0 ?
      resendErrors / resendRequests :
      base.resend_error_rate ?? (resendErrors > 0 ? 1 : 0);

  const normalized = {
    window_start: base.window_start,
    window_days: base.window_days,
    submissions,
    authenticated,
    pending,
    errors,
    conversion_rate: Number(conversionRate.toFixed(4)),
    pending_ratio: Number(pendingRatio.toFixed(4)),
    error_rate: Number(errorRate.toFixed(4)),
    resend_requests: resendRequests,
    resend_success: resendSuccess,
    resend_errors: resendErrors,
    resend_error_rate: Number(resendErrorRate.toFixed(4)),
    resend_status_counts: resendStatusCounts,
    pending_logout_failures: pendingLogoutFailures,
  };

  const conversionSeverity = deriveInvertedSeverity(
    normalized.conversion_rate,
    ALERT_THRESHOLDS.signup.conversion_rate,
  );
  const pendingSeverity = severityFromThresholds(
    normalized.pending_ratio,
    ALERT_THRESHOLDS.signup.pending_ratio,
  );
  const errorSeverity = severityFromThresholds(
    normalized.error_rate,
    ALERT_THRESHOLDS.signup.error_rate,
  );
  const resendSeverity = severityFromThresholds(
    normalized.resend_error_rate,
    ALERT_THRESHOLDS.signup.resend_error_rate,
  );
  const pendingLogoutSeverity = severityFromThresholds(
    normalized.pending_logout_failures,
    ALERT_THRESHOLDS.signup.pending_logout_failures,
  );

  return {
    ...normalized,
    status: worstSeverity(
      conversionSeverity,
      worstSeverity(
        pendingSeverity,
        worstSeverity(errorSeverity, worstSeverity(resendSeverity, pendingLogoutSeverity)),
      ),
    ),
    thresholds: ALERT_THRESHOLDS.signup,
  };
}

export function summarizeOpsMetrics(rows: OpsMetricNormalized[]) {
  let total = 0;
  let serverErrors = 0;
  let clientErrors = 0;
  let slow = 0;

  const slowRoutes: Array<{
    route: string;
    status_code: number;
    avg_duration_ms: number;
    count: number;
  }> = [];
  const serverErrorRoutes: Array<{ route: string; status_code: number; count: number }> = [];

  for (const row of rows) {
    total += row.count;
    if (row.status_code >= 500) {
      serverErrors += row.count;
      serverErrorRoutes.push({
        route: row.route,
        status_code: row.status_code,
        count: row.count,
      });
    } else if (row.status_code >= 400) {
      clientErrors += row.count;
    }
    if (row.avg_duration_ms >= ALERT_THRESHOLDS.ops.avg_duration_ms.warn) {
      slow += row.count;
      slowRoutes.push({
        route: row.route,
        status_code: row.status_code,
        avg_duration_ms: Number(row.avg_duration_ms.toFixed(2)),
        count: row.count,
      });
    }
  }

  slowRoutes.sort((a, b) => b.avg_duration_ms - a.avg_duration_ms);
  serverErrorRoutes.sort((a, b) => b.count - a.count);

  const totalRequests = total;
  const denominator = totalRequests > 0 ? totalRequests : 1;

  return {
    total_requests: totalRequests,
    server_error_rate: totalRequests > 0 ? Number((serverErrors / denominator).toFixed(4)) : 0,
    client_error_rate: totalRequests > 0 ? Number((clientErrors / denominator).toFixed(4)) : 0,
    slow_rate: totalRequests > 0 ? Number((slow / denominator).toFixed(4)) : 0,
    slow_routes: slowRoutes.slice(0, 5),
    top_server_error_routes: serverErrorRoutes.slice(0, 5),
  };
}

export function formatMetricsJson(
  devices: DeviceSummaryInput,
  opsRows: OpsMetricInput[],
  signupSummary?: SignupFunnelSummary,
  generatedAt: string = nowISO(),
) {
  const summary = normalizeDeviceSummary(devices);
  const ops = normalizeOpsMetrics(opsRows);
  const opsSummary = summarizeOpsMetrics(ops);
  const offlineRatio = summary.total > 0 ? summary.offline / summary.total : 0;
  const signup = normalizeSignupSummary(signupSummary, generatedAt);

  return {
    devices: {
      ...summary,
      offline_ratio: Number(offlineRatio.toFixed(4)),
    },
    ops,
    ops_summary: opsSummary,
    signup,
    thresholds: ALERT_THRESHOLDS,
    generated_at: generatedAt,
  };
}

export function formatPromMetrics(
  devices: DeviceSummaryInput,
  opsRows: OpsMetricInput[],
  signupSummary?: SignupFunnelSummary,
  timestampMs: number = Date.now(),
) {
  const summary = normalizeDeviceSummary(devices);
  const ops = normalizeOpsMetrics(opsRows);
  const opsSummary = summarizeOpsMetrics(ops);
  const offlineRatio = summary.total > 0 ? summary.offline / summary.total : 0;
  const signup = normalizeSignupSummary(signupSummary, new Date(timestampMs).toISOString());
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
    "# HELP greenbro_devices_offline_ratio Fraction of devices currently offline",
    "# TYPE greenbro_devices_offline_ratio gauge",
    `greenbro_devices_offline_ratio ${offlineRatio}`,
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
  lines.push("# HELP greenbro_ops_requests_overall_total Total recorded API requests (all routes)");
  lines.push("# TYPE greenbro_ops_requests_overall_total counter");
  lines.push(`greenbro_ops_requests_overall_total ${opsSummary.total_requests}`);
  lines.push("# HELP greenbro_ops_server_error_rate Share of requests returning 5xx");
  lines.push("# TYPE greenbro_ops_server_error_rate gauge");
  lines.push(`greenbro_ops_server_error_rate ${opsSummary.server_error_rate}`);
  lines.push("# HELP greenbro_ops_client_error_rate Share of requests returning 4xx");
  lines.push("# TYPE greenbro_ops_client_error_rate gauge");
  lines.push(`greenbro_ops_client_error_rate ${opsSummary.client_error_rate}`);
  lines.push("# HELP greenbro_ops_slow_rate Share of requests above avg latency threshold");
  lines.push("# TYPE greenbro_ops_slow_rate gauge");
  lines.push(`greenbro_ops_slow_rate ${opsSummary.slow_rate}`);
  lines.push("# HELP greenbro_signup_submissions_total Signup submissions captured within window");
  lines.push("# TYPE greenbro_signup_submissions_total gauge");
  lines.push(`greenbro_signup_submissions_total ${signup.submissions}`);
  lines.push("# HELP greenbro_signup_authenticated_total Signup verifications completed within window");
  lines.push("# TYPE greenbro_signup_authenticated_total gauge");
  lines.push(`greenbro_signup_authenticated_total ${signup.authenticated}`);
  lines.push("# HELP greenbro_signup_pending_total Pending verifications within window");
  lines.push("# TYPE greenbro_signup_pending_total gauge");
  lines.push(`greenbro_signup_pending_total ${signup.pending}`);
  lines.push("# HELP greenbro_signup_error_total Signup errors recorded within window");
  lines.push("# TYPE greenbro_signup_error_total gauge");
  lines.push(`greenbro_signup_error_total ${signup.errors}`);
  lines.push("# HELP greenbro_signup_conversion_rate Signup conversion rate within window");
  lines.push("# TYPE greenbro_signup_conversion_rate gauge");
  lines.push(`greenbro_signup_conversion_rate ${signup.conversion_rate}`);
  lines.push("# HELP greenbro_signup_pending_ratio Pending verification ratio within window");
  lines.push("# TYPE greenbro_signup_pending_ratio gauge");
  lines.push(`greenbro_signup_pending_ratio ${signup.pending_ratio}`);
  lines.push("# HELP greenbro_signup_error_ratio Signup error ratio within window");
  lines.push("# TYPE greenbro_signup_error_ratio gauge");
  lines.push(`greenbro_signup_error_ratio ${signup.error_rate}`);
  lines.push("# HELP greenbro_signup_resend_requests_total Verification resend attempts within window");
  lines.push("# TYPE greenbro_signup_resend_requests_total gauge");
  lines.push(`greenbro_signup_resend_requests_total ${signup.resend_requests}`);
  lines.push("# HELP greenbro_signup_resend_success_total Successful verification resends within window");
  lines.push("# TYPE greenbro_signup_resend_success_total gauge");
  lines.push(`greenbro_signup_resend_success_total ${signup.resend_success}`);
  lines.push("# HELP greenbro_signup_resend_error_total Failed verification resends within window");
  lines.push("# TYPE greenbro_signup_resend_error_total gauge");
  lines.push(`greenbro_signup_resend_error_total ${signup.resend_errors}`);
  lines.push("# HELP greenbro_signup_resend_error_ratio Verification resend failure ratio within window");
  lines.push("# TYPE greenbro_signup_resend_error_ratio gauge");
  lines.push(`greenbro_signup_resend_error_ratio ${signup.resend_error_rate}`);
  lines.push("# HELP greenbro_mobile_pending_logout_flush_failed_total Pending logout flush failures reported by mobile clients");
  lines.push("# TYPE greenbro_mobile_pending_logout_flush_failed_total gauge");
  lines.push(`greenbro_mobile_pending_logout_flush_failed_total ${signup.pending_logout_failures}`);

  return lines.join("\n") + "\n";
}

function severityFromThresholds(
  value: number,
  thresholds: { warn: number; critical: number },
): SeverityLevel {
  if (value >= thresholds.critical) return "critical";
  if (value >= thresholds.warn) return "warn";
  return "ok";
}

function deriveInvertedSeverity(
  value: number,
  thresholds: { warn: number; critical: number },
): SeverityLevel {
  if (value <= thresholds.critical) return "critical";
  if (value <= thresholds.warn) return "warn";
  return "ok";
}

function worstSeverity(a: SeverityLevel, b: SeverityLevel): SeverityLevel {
  return severityWeight(a) >= severityWeight(b) ? a : b;
}

function severityWeight(level: SeverityLevel): number {
  switch (level) {
    case "critical":
      return 3;
    case "warn":
      return 2;
    default:
      return 1;
  }
}
