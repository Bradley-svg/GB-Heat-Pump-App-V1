import { describe, expect, it, vi } from "vitest";

import type { Env } from "../../env";
import { handleMetrics } from "../metrics";

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
      return {
        all: vi.fn().mockResolvedValue({ results: opsRows }),
        first: vi.fn(),
      };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  });

  const env: Env = {
    DB: {
      prepare,
    } as any,
    ACCESS_JWKS_URL: "",
    ACCESS_AUD: "",
    APP_BASE_URL: "",
    RETURN_DEFAULT: "",
    HEARTBEAT_INTERVAL_SECS: "30",
    OFFLINE_MULTIPLIER: "6",
    CURSOR_SECRET: "",
  };

  return { env, prepare, deviceRow, opsRows };
}

describe("handleMetrics", () => {
  it("returns JSON metrics when requested", async () => {
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
  });

  it("returns Prometheus metrics text by default", async () => {
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
});
