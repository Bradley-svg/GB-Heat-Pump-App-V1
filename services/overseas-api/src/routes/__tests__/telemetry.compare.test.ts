import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../../env";
import { handleTelemetryLatestBatch, handleTelemetrySeries } from "../telemetry";

const warnSpy = vi.fn();
let legacyLatestMock!: ReturnType<typeof vi.fn>;
let legacySeriesMock!: ReturnType<typeof vi.fn>;

vi.mock("../../utils/logging", async () => {
  const actual = await vi.importActual<typeof import("../../utils/logging")>(
    "../../utils/logging",
  );
  return {
    ...actual,
    loggerForRequest: vi.fn(() => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: warnSpy,
        error: vi.fn(),
        with: vi.fn(() => logger),
      };
      return logger;
    }),
  };
});

vi.mock("../../lib/access", async () => {
  const actual = await vi.importActual<typeof import("../../lib/access")>("../../lib/access");
  return {
    ...actual,
    requireAccessUser: vi.fn(async () => ({
      email: "compare@example.com",
      roles: ["admin"],
      clientIds: ["profile-west"],
    })),
  };
});

vi.mock("../../lib/telemetry-access", () => ({
  resolveLatestBatchDevices: vi.fn(async () => ({
    scope: { empty: false, isAdmin: true, clause: "", bind: [], maskPrecision: 2 },
    requested: [{ token: "device-1", index: 0, resolved: "device-1" }],
    resolvedIds: ["device-1"],
    missingTokens: [],
  })),
  presentLatestBatchRow: vi.fn(async () => ({ device: "device-1", latest: 42 })),
  resolveTelemetrySeriesConfig: vi.fn(async () => ({
    ok: true,
    config: {
      bucketMs: 60_000,
      startMs: 0,
      endMs: 60_000,
      metrics: ["cop"],
      whereClause: "1=1",
      bindings: [],
      scopeDescriptor: { type: "fleet", profile_ids: null },
      fillMode: "none" as const,
      tenantPrecision: 2,
    },
  })),
}));

vi.mock("../../lib/telemetry-store", () => ({
  fetchLatestTelemetryBatch: vi.fn(async () => [
    {
      device_id: "device-1",
    },
  ]),
  fetchTelemetrySeries: vi.fn(async () => [
    {
      bucket_start_ms: 0,
      sample_count: 1,
      avg_deltaT: null,
      min_deltaT: null,
      max_deltaT: null,
      avg_thermalKW: null,
      min_thermalKW: null,
      max_thermalKW: null,
      avg_cop: 2,
      min_cop: 2,
      max_cop: 2,
      avg_supplyC: null,
      avg_returnC: null,
      avg_flowLps: null,
      avg_powerKW: null,
    },
  ]),
}));

vi.mock("../../routes/telemetry.legacy", () => {
  return {
    legacyHandleTelemetryLatestBatch: vi.fn(),
    legacyHandleTelemetrySeries: vi.fn(),
  };
});

vi.mock("../../utils", async () => {
  const actual = await vi.importActual<typeof import("../../utils")>("../../utils");
  return {
    ...actual,
    nowISO: () => "2025-01-01T00:00:00.000Z",
  };
});

beforeAll(async () => {
  const legacyModule = await import("../../routes/telemetry.legacy");
  legacyLatestMock = vi.mocked(legacyModule.legacyHandleTelemetryLatestBatch);
  legacySeriesMock = vi.mocked(legacyModule.legacyHandleTelemetrySeries);
});

function createEnv(overrides: Partial<Env> = {}): Env {
  const base: Partial<Env> = {
    DB: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
        })),
      })),
    } as unknown as Env["DB"],
    ACCESS_JWKS_URL: "https://access.test/certs",
    ACCESS_AUD: "test-audience",
    APP_BASE_URL: "https://app.test/app",
    RETURN_DEFAULT: "https://example.com/",
    CURSOR_SECRET: "cursor-secret",
    INGEST_ALLOWED_ORIGINS: "https://devices.test",
    INGEST_RATE_LIMIT_PER_MIN: "120",
    INGEST_SIGNATURE_TOLERANCE_SECS: "300",
    TELEMETRY_REFACTOR_MODE: "compare",
    CLIENT_EVENT_TOKEN_SECRET: "test-telemetry-token-secret-rotate-1234567890",
    CLIENT_EVENT_TOKEN_TTL_SECONDS: "900",
  };
  return { ...base, ...overrides } as Env;
}

function collectMismatchCalls() {
  return warnSpy.mock.calls.filter(([event]) => event === "telemetry.refactor.shadow_mismatch");
}

describe("telemetry compare-mode shadowing", () => {
  beforeEach(() => {
    warnSpy.mockClear();
    legacyLatestMock.mockReset();
    legacySeriesMock.mockReset();
  });

  it("does not log mismatches when latest batch responses align", async () => {
    legacyLatestMock.mockResolvedValue(
      Response.json({
        generated_at: "2025-01-01T00:00:00.000Z",
        items: [{ device: "device-1", latest: 42 }],
        missing: [],
      }),
    );

    const env = createEnv();
    const req = new Request("https://example.com/api/telemetry/latest-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ devices: ["device-1"] }),
    });
    const waiters: Promise<void>[] = [];
    const ctx = {
      waitUntil(promise: Promise<void>) {
        waiters.push(promise);
      },
    } as ExecutionContext;

    const res = await handleTelemetryLatestBatch(req, env, ctx);
    expect(res.status).toBe(200);
    await Promise.all(waiters);
    expect(collectMismatchCalls()).toHaveLength(0);
  });

  it("logs mismatches when legacy latest batch diverges", async () => {
    legacyLatestMock.mockResolvedValue(
      Response.json({
        generated_at: "2025-01-01T00:00:00.000Z",
        items: [{ device: "device-1", latest: 99 }],
        missing: [],
      }),
    );

    const env = createEnv();
    const req = new Request("https://example.com/api/telemetry/latest-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ devices: ["device-1"] }),
    });
    const waiters: Promise<void>[] = [];
    const ctx = {
      waitUntil(promise: Promise<void>) {
        waiters.push(promise);
      },
    } as ExecutionContext;

    const res = await handleTelemetryLatestBatch(req, env, ctx);
    expect(res.status).toBe(200);
    await Promise.all(waiters);
    expect(collectMismatchCalls()).toHaveLength(1);
  });

  it("logs mismatches for telemetry series divergences", async () => {
    legacySeriesMock.mockResolvedValue(
      Response.json({
        generated_at: "2025-01-01T00:00:00.000Z",
        scope: { type: "fleet", profile_ids: null },
        interval_ms: 60_000,
        window: {
          start: new Date(0).toISOString(),
          end: new Date(60_000).toISOString(),
        },
        metrics: ["cop"],
        series: [
          {
            bucket_start: new Date(0).toISOString(),
            sample_count: 1,
            stale: false,
            values: { cop: { avg: 1, min: 1, max: 1 } },
          },
        ],
      }),
    );

    const env = createEnv();
    const req = new Request("https://example.com/api/telemetry/series?metric=cop", {
      headers: { "cf-access-jwt-assertion": "token" },
    });
    const waiters: Promise<void>[] = [];
    const ctx = {
      waitUntil(promise: Promise<void>) {
        waiters.push(promise);
      },
    } as ExecutionContext;

    const res = await handleTelemetrySeries(req, env, ctx);
    expect(res.status).toBe(200);
    await Promise.all(waiters);
    expect(collectMismatchCalls()).toHaveLength(1);
  });
});
