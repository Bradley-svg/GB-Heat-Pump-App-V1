import type { Env } from "../env";

const DAY_MS = 24 * 60 * 60 * 1000;
export const SIGNUP_FUNNEL_WINDOW_DAYS = 7;

export interface SignupFunnelSummary {
  window_start: string;
  window_days: number;
  submissions: number;
  authenticated: number;
  pending: number;
  errors: number;
  conversion_rate: number;
  pending_ratio: number;
  error_rate: number;
  resend_requests: number;
  resend_success: number;
  resend_errors: number;
  resend_error_rate: number;
  resend_status_counts: Record<string, number>;
  pending_logout_failures: number;
}

interface RawSignupRow {
  event: string | null;
  dimension: string | null;
  count: number | string | null;
}

export async function loadSignupFunnelSummary(
  env: Env,
  options: { now?: Date; windowDays?: number } = {},
): Promise<SignupFunnelSummary> {
  const now = options.now ?? new Date();
  const windowDays = options.windowDays ?? SIGNUP_FUNNEL_WINDOW_DAYS;
  const windowStart = new Date(now.getTime() - windowDays * DAY_MS).toISOString();

  const empty = createEmptySummary(windowStart, windowDays);
  let rows: RawSignupRow[] = [];
  try {
    const result = await env.DB.prepare(
      `SELECT event,
              COALESCE(dimension, '') AS dimension,
              COUNT(*) AS count
         FROM client_events
        WHERE created_at >= ?1
          AND event IN (
            'signup_flow.result',
            'signup_flow.error',
            'signup_flow.resend',
            'auth.pending_logout.flush_failed'
          )
        GROUP BY event, dimension`,
    )
      .bind(windowStart)
      .all<RawSignupRow>();
    rows = result.results ?? [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("no such table")) {
      return empty;
    }
    throw error;
  }

  if (!rows.length) {
    return empty;
  }

  let submissions = 0;
  let authenticated = 0;
  let pending = 0;
  let errors = 0;
  let resendRequests = 0;
  let resendSuccess = 0;
  let resendErrors = 0;
  const resendStatusCounts: Record<string, number> = {};
  let pendingLogoutFailures = 0;

  for (const row of rows) {
    const event = (row.event ?? "").trim();
    const dimension = (row.dimension ?? "").trim();
    const count = coerceCount(row.count);
    if (event === "signup_flow.result") {
      submissions += count;
      if (dimension === "authenticated") {
        authenticated += count;
      } else if (dimension === "pending_verification") {
        pending += count;
      }
    } else if (event === "signup_flow.error") {
      errors += count;
    } else if (event === "signup_flow.resend") {
      resendRequests += count;
      const status = dimension || "unknown";
      resendStatusCounts[status] = (resendStatusCounts[status] ?? 0) + count;
      if (status === "ok") {
        resendSuccess += count;
      } else {
        resendErrors += count;
      }
    } else if (event === "auth.pending_logout.flush_failed") {
      pendingLogoutFailures += count;
    }
  }

  const conversionRate = submissions > 0 ? authenticated / submissions : 0;
  const pendingRatio = submissions > 0 ? pending / submissions : pending > 0 ? 1 : 0;
  const errorRate = submissions > 0 ? errors / submissions : errors > 0 ? 1 : 0;
  const resendErrorRate =
    resendRequests > 0 ? resendErrors / resendRequests : resendErrors > 0 ? 1 : 0;

  return {
    window_start: windowStart,
    window_days: windowDays,
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
}

function coerceCount(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function createEmptySummary(windowStart: string, windowDays: number): SignupFunnelSummary {
  return {
    window_start: windowStart,
    window_days: windowDays,
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
}
