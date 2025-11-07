import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import type { Env, User } from "../../env";
import * as accessModule from "../../lib/access";
import { handleMetrics } from "../metrics";
import * as loggingModule from "../../utils/logging";
import * as signupModule from "../../lib/signup-funnel";

vi.mock("../../lib/signup-funnel", () => ({
  loadSignupFunnelSummary: vi.fn().mockResolvedValue({
    window_start: "2025-01-01T00:00:00.000Z",
    window_days: 7,
    submissions: 4,
    authenticated: 2,
    pending: 1,
    errors: 1,
    conversion_rate: 0.5,
    pending_ratio: 0.25,
    error_rate: 0.25,
    resend_requests: 3,
    resend_success: 2,
    resend_errors: 1,
    resend_error_rate: 0.3333,
    resend_status_counts: { ok: 2, "429": 1 },
    pending_logout_failures: 0,
  }),
}));

function createMockEnv(overrides?: {
  device?: { total: number; online: number | null };
  ops?: Array<{ route: string | null; status_code: number | null; count: number | null }>;
}) {
  const deviceRow = overrides?.device ?? { total: 5, online: 3 };
  const opsRows =
    overrides?.ops ??
    [
      { route: "/api/ingest", status_code: 200, count: 2 },
      { route: "/api/ingest", status_code: 500, count: 1 },
    ];

  const prepare = vi.fn((sql: string) => {
    if (sql.includes("FROM devices")) {
      return {
        first: vi.fn().mockResolvedValue(deviceRow),
        all: vi.fn(),
      };
    }

    if (sql.includes("FROM ops_metrics")) {
      const all = vi.fn().mockResolvedValue({ results: opsRows });
      const run = vi.fn().mockResolvedValue({});
      const bind = vi.fn().mockReturnValue({ all, run });
      return {
        all,
        bind,
        run,
        first: vi.fn(),
      };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  });

  const env: Env = {
    DB: {
      prepare,
    } as any,
    ACCESS_JWKS_URL: "https://access.test/.well-known/jwks.json",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "",
    RETURN_DEFAULT: "",
    HEARTBEAT_INTERVAL_SECS: "30",
    OFFLINE_MULTIPLIER: "6",
    CURSOR_SECRET: "integration-secret-metrics",
    INGEST_ALLOWED_ORIGINS: "https://devices.example.com",
    INGEST_RATE_LIMIT_PER_MIN: "120",
    INGEST_SIGNATURE_TOLERANCE_SECS: "300",
  };

  return { env, prepare, deviceRow, opsRows };
}

const requireAccessUserMock = vi.spyOn(accessModule, "requireAccessUser");
const loadSignupFunnelSummaryMock = vi.mocked(signupModule.loadSignupFunnelSummary);
const loggerForRequestMock = vi.spyOn(loggingModule, "loggerForRequest");

function createLoggerStub() {
  const stub = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    with: vi.fn(),
  };
  stub.with.mockReturnValue(stub);
  return stub;
}

const ADMIN_USER: User = {
  email: "admin@example.com",
  roles: ["admin"],
  clientIds: [],
};

afterEach(() => {
  requireAccessUserMock.mockReset();
  loadSignupFunnelSummaryMock.mockClear();
  loggerForRequestMock.mockReset();
});

afterAll(() => {
  requireAccessUserMock.mockRestore();
  loadSignupFunnelSummaryMock.mockRestore();
  loggerForRequestMock.mockRestore();
});

describe("handleMetrics", () => {
  it("returns JSON metrics when requested", async () => {
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);
    const { env, deviceRow, opsRows } = createMockEnv();
    const req = new Request("https://example.com/metrics?format=json");
    const res = await handleMetrics(req, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);

    const body = (await res.json()) as any;
    expect(body.devices).toEqual({
      total: deviceRow.total,
      online: deviceRow.online,
      offline: deviceRow.total - (deviceRow.online ?? 0),
      offline_ratio: expect.any(Number),
    });
    expect(body.devices.offline_ratio).toBe(
      Number((body.devices.offline / body.devices.total).toFixed(4)),
    );
    expect(body.ops).toEqual(
      opsRows.map((row) => ({
        route: row.route ?? "unknown",
        status_code: row.status_code ?? 0,
        count: row.count ?? 0,
        total_duration_ms: 0,
        avg_duration_ms: 0,
        max_duration_ms: 0,
      })),
    );
    expect(body.ops_summary).toEqual({
      total_requests: 3,
      server_error_rate: Number((1 / 3).toFixed(4)),
      client_error_rate: 0,
      slow_rate: 0,
      slow_routes: [],
      top_server_error_routes: [{ route: "/api/ingest", status_code: 500, count: 1 }],
    });
    expect(body.thresholds.devices.offline_ratio.warn).toBeGreaterThan(0);
    expect(typeof body.generated_at).toBe("string");
    expect(body.ops_window).toMatchObject({
      start: expect.any(String),
      days: expect.any(Number),
    });
    expect(body.signup).toMatchObject({
      submissions: 4,
      authenticated: 2,
      pending: 1,
      errors: 1,
      status: expect.any(String),
      resend_requests: 3,
      pending_logout_failures: 0,
    });
    expect(loadSignupFunnelSummaryMock).toHaveBeenCalled();
  });

  it("returns dashboard payload with derived statuses", async () => {
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);
    const logger = createLoggerStub();
    loggerForRequestMock.mockReturnValueOnce(logger as unknown as loggingModule.Logger);
    const opsRows = [
      { route: "/api/ingest", status_code: 200, count: 50 },
      { route: "/api/ingest", status_code: 500, count: 10 },
    ];
    const { env } = createMockEnv({
      device: { total: 10, online: 5 },
      ops: opsRows,
    });
    const req = new Request("https://example.com/metrics?format=dashboard");
    const res = await handleMetrics(req, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    const body = (await res.json()) as any;
    expect(body.devices.status).toMatch(/ok|warn|critical/);
    expect(body.ops.status).toMatch(/ok|warn|critical/);
    expect(body.ops.metrics.server_error_rate.value).toBeGreaterThan(0);
    expect(Array.isArray(body.ops.slow_routes)).toBe(true);
    expect(body.signup).toBeTruthy();
    expect(body.signup.metrics.conversion_rate.value).toBeGreaterThan(0);
    expect(body.ops_window).toMatchObject({
      start: expect.any(String),
      days: expect.any(Number),
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("returns Prometheus metrics text by default", async () => {
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);
    const { env } = createMockEnv();
    const req = new Request("https://example.com/metrics");
    const res = await handleMetrics(req, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);

    const body = await res.text();
    expect(body).toContain("greenbro_devices_total 5");
    expect(body).toContain('greenbro_ops_requests_total{route="/api/ingest",status="200"} 2');
    expect(body).toMatch(/greenbro_metrics_generated_at \d+/);
  });

  it("returns 401 when no access token is provided", async () => {
    requireAccessUserMock.mockResolvedValueOnce(null);
    const { env } = createMockEnv();
    const req = new Request("https://example.com/metrics");
    const res = await handleMetrics(req, env);
    expect(res.status).toBe(401);
  });

  it("logs a warning when signup funnel is degraded", async () => {
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);
    loadSignupFunnelSummaryMock.mockResolvedValueOnce({
      window_start: "2025-01-01T00:00:00.000Z",
      window_days: 7,
      submissions: 20,
      authenticated: 5,
      pending: 10,
      errors: 5,
      conversion_rate: 0.25,
      pending_ratio: 0.5,
      error_rate: 0.25,
      resend_requests: 10,
      resend_success: 4,
      resend_errors: 6,
      resend_error_rate: 0.6,
      resend_status_counts: { ok: 4, "429": 4, other: 2 },
      pending_logout_failures: 7,
    });
    const logger = createLoggerStub();
    loggerForRequestMock.mockReturnValueOnce(logger as unknown as loggingModule.Logger);
    const { env } = createMockEnv();
    const req = new Request("https://example.com/metrics?format=json");
    const res = await handleMetrics(req, env);
    expect(res.status).toBe(200);
    expect(logger.warn).toHaveBeenCalledWith(
      "signup.funnel_degraded",
      expect.objectContaining({
        metric_key: "signup.funnel_degraded",
      }),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      "signup.resend_degraded",
      expect.objectContaining({
        resend_error_rate: expect.any(Number),
      }),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      "auth.pending_logout.flush_failed.aggregate",
      expect.objectContaining({
        failures: 7,
      }),
    );
  });
});
beforeEach(() => {
  loggerForRequestMock.mockReturnValue(createLoggerStub() as unknown as loggingModule.Logger);
});
