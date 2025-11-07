import { describe, expect, it } from "vitest";

import {
  ALERT_THRESHOLDS,
  deriveTelemetryMetrics,
  formatMetricsJson,
  formatPromMetrics,
  maskTelemetryNumber,
  pickMetricsFormat,
} from "../index";

describe("deriveTelemetryMetrics", () => {
  it("derives thermal output and COP with rounding", () => {
    const result = deriveTelemetryMetrics({
      supplyC: 45.2,
      returnC: 40.1,
      flowLps: 0.2,
      powerKW: 1.2,
    });

    expect(result.deltaT).toBe(5.1);
    expect(result.thermalKW).toBe(4.26);
    expect(result.cop).toBe(3.55);
    expect(result.cop_quality).toBe("measured");
  });

  it("returns null metrics when inputs are incomplete", () => {
    const result = deriveTelemetryMetrics({
      supplyC: 36.5,
      returnC: 35.1,
      flowLps: null,
      powerKW: 0.9,
    });

    expect(result.deltaT).toBe(1.4);
    expect(result.thermalKW).toBeNull();
    expect(result.cop).toBeNull();
    expect(result.cop_quality).toBeNull();
  });
});

describe("maskTelemetryNumber", () => {
  it("passes through admin values unless precision is provided", () => {
    expect(maskTelemetryNumber(2.3456, true)).toBe(2.3456);
    expect(maskTelemetryNumber(2.3456, true, 1, 2)).toBe(2.35);
  });

  it("rounds tenant values to the requested precision", () => {
    expect(maskTelemetryNumber(2.3456, false)).toBe(2.3);
    expect(maskTelemetryNumber(9.999, false, 2)).toBe(10);
    expect(maskTelemetryNumber(null, false)).toBeNull();
  });
});

describe("metrics formatting", () => {
  it("builds normalized JSON metrics payloads", () => {
    const payload = formatMetricsJson(
      { total: 10, online: 6 },
      [
        { route: "/api/devices", status_code: 200, count: 5 },
        { route: null, status_code: null, count: null },
      ],
      {
        window_start: "2024-12-25T00:00:00.000Z",
        window_days: 7,
        submissions: 10,
        authenticated: 6,
        pending: 3,
        errors: 1,
        conversion_rate: 0.6,
        pending_ratio: 0.3,
        error_rate: 0.1,
      },
      "2025-01-01T00:00:00.000Z",
    );

    expect(payload.devices).toEqual({
      total: 10,
      online: 6,
      offline: 4,
      offline_ratio: 0.4,
    });
    expect(payload.ops).toEqual([
      {
        route: "/api/devices",
        status_code: 200,
        count: 5,
        total_duration_ms: 0,
        avg_duration_ms: 0,
        max_duration_ms: 0,
      },
      {
        route: "unknown",
        status_code: 0,
        count: 0,
        total_duration_ms: 0,
        avg_duration_ms: 0,
        max_duration_ms: 0,
      },
    ]);
    expect(payload.ops_summary).toEqual({
      total_requests: 5,
      server_error_rate: 0,
      client_error_rate: 0,
      slow_rate: 0,
      slow_routes: [],
      top_server_error_routes: [],
    });
    expect(payload.thresholds).toEqual(ALERT_THRESHOLDS);
    expect(payload.generated_at).toBe("2025-01-01T00:00:00.000Z");
    expect(payload.signup).toMatchObject({
      submissions: 10,
      authenticated: 6,
      pending: 3,
      errors: 1,
      conversion_rate: 0.6,
      pending_ratio: 0.3,
      error_rate: 0.1,
      window_start: "2024-12-25T00:00:00.000Z",
      window_days: 7,
      status: "ok",
    });
  });

  it("produces prometheus output with escaped labels", () => {
    const prom = formatPromMetrics(
      { total: 5, online: 3 },
      [{ route: '/api/"test"', status_code: 500, count: 2 }],
      {
        window_start: "2024-12-20T00:00:00.000Z",
        window_days: 7,
        submissions: 12,
        authenticated: 8,
        pending: 3,
        errors: 2,
        conversion_rate: 0.66,
        pending_ratio: 0.25,
        error_rate: 0.16,
      },
      5000,
    );

    expect(prom).toContain(`greenbro_devices_total 5`);
    expect(prom).toContain(`greenbro_devices_online_total 3`);
    expect(prom).toContain(`greenbro_devices_offline_total 2`);
    expect(prom).toContain(`greenbro_devices_offline_ratio 0.4`);
    expect(prom).toContain(`greenbro_ops_requests_total{route="/api/\\"test\\"",status="500"} 2`);
    expect(prom).toContain(`greenbro_metrics_generated_at 5`);
    expect(prom).toContain(`greenbro_ops_requests_overall_total 2`);
    expect(prom).toContain(`greenbro_ops_server_error_rate 1`);
    expect(prom).toContain(`greenbro_ops_client_error_rate 0`);
    expect(prom).toContain(`greenbro_ops_slow_rate 0`);
    expect(prom).toContain(`greenbro_signup_submissions_total 12`);
    expect(prom).toContain(`greenbro_signup_conversion_rate 0.66`);
    expect(prom).toContain(`greenbro_signup_error_total 2`);
  });
});

describe("pickMetricsFormat", () => {
  it("honors explicit format requests", () => {
    expect(pickMetricsFormat("json", "text/plain")).toBe("json");
  });

  it("falls back to accept header", () => {
    expect(pickMetricsFormat(null, "application/json")).toBe("json");
    expect(pickMetricsFormat(undefined, "text/plain")).toBe("prom");
  });
});
