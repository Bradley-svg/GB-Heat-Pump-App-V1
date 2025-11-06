import { afterEach, describe, expect, it } from "vitest";

import type { User } from "../../env";
import { buildDeviceScope } from "../device";
import {
  fetchLatestTelemetryBatch,
  fetchTelemetrySeries,
  type TelemetrySeriesQueryConfig,
} from "../telemetry-store";
import {
  createTelemetryTestEnv,
  insertTelemetrySamples,
} from "./telemetry-test-helpers";

const ADMIN_USER: User = {
  email: "admin@example.com",
  roles: ["admin"],
  clientIds: [],
};

const TENANT_USER: User = {
  email: "tenant@example.com",
  roles: ["client"],
  clientIds: ["profile-west"],
};

describe("telemetry-store", () => {
  let closeDb: (() => void) | null = null;

  afterEach(() => {
    if (closeDb) {
      closeDb();
      closeDb = null;
    }
  });

  it("fetches latest telemetry respecting scope", async () => {
    const { env, sqlite } = createTelemetryTestEnv();
    closeDb = () => sqlite.close();

    const scope = buildDeviceScope(ADMIN_USER);
    const rows = await fetchLatestTelemetryBatch(env, ["dev-1001"], scope);
    expect(rows).toHaveLength(1);
    expect(rows[0].profile_id).toBe("profile-west");

    const tenantScope = buildDeviceScope(TENANT_USER);
    const tenantRows = await fetchLatestTelemetryBatch(env, ["dev-1002"], tenantScope);
    expect(tenantRows).toHaveLength(0);
  });

  it("aggregates telemetry series for the requested window", async () => {
    const { env, sqlite } = createTelemetryTestEnv();
    closeDb = () => sqlite.close();

    const base = Date.UTC(2025, 0, 1, 10, 0, 0);
    await insertTelemetrySamples(env, "dev-1001", [
      {
        ts: base,
        deltaT: 5,
        thermalKW: 4,
        cop: 3.1,
        supplyC: 45,
        returnC: 39.5,
        flowLps: 0.3,
        powerKW: 1.5,
      },
      {
        ts: base + 30_000,
        deltaT: 7,
        thermalKW: 5,
        cop: 3.8,
        supplyC: 46,
        returnC: 39.2,
        flowLps: 0.34,
        powerKW: 1.7,
      },
    ]);

    const config: TelemetrySeriesQueryConfig = {
      bucketMs: 60_000,
      startMs: base - 60_000,
      endMs: base + 120_000,
      whereClause: "t.ts BETWEEN params.start_ms AND params.end_ms AND t.device_id = ?",
      bindings: ["dev-1001"],
    };

    const rows = await fetchTelemetrySeries(env, config);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row.sample_count).toBe(2);
    expect(row.avg_deltaT).toBeCloseTo(6, 5);
    expect(row.avg_thermalKW).toBeCloseTo(4.5, 5);
  });

  it("weights aggregated averages by per-device sample counts", async () => {
    const { env, sqlite } = createTelemetryTestEnv();
    closeDb = () => sqlite.close();

    const base = Date.UTC(2025, 0, 1, 11, 0, 0);
    await insertTelemetrySamples(env, "dev-1001", [
      {
        ts: base,
        deltaT: 2,
        thermalKW: 2,
        cop: 3,
        supplyC: 40,
        returnC: 38,
        flowLps: 0.25,
        powerKW: 1.2,
      },
    ]);
    await insertTelemetrySamples(env, "dev-1002", [
      {
        ts: base + 10_000,
        deltaT: 8,
        thermalKW: 5,
        cop: 3.4,
        supplyC: 46,
        returnC: 39,
        flowLps: 0.28,
        powerKW: 1.3,
      },
      {
        ts: base + 20_000,
        deltaT: 10,
        thermalKW: 6,
        cop: 3.6,
        supplyC: 47,
        returnC: 40,
        flowLps: 0.3,
        powerKW: 1.4,
      },
      {
        ts: base + 30_000,
        deltaT: 12,
        thermalKW: 7,
        cop: 3.8,
        supplyC: 48,
        returnC: 41,
        flowLps: 0.32,
        powerKW: 1.5,
      },
    ]);

    const config: TelemetrySeriesQueryConfig = {
      bucketMs: 60_000,
      startMs: base - 60_000,
      endMs: base + 120_000,
      whereClause:
        "t.ts BETWEEN params.start_ms AND params.end_ms AND t.device_id IN (?, ?)",
      bindings: ["dev-1001", "dev-1002"],
    };

    const rows = await fetchTelemetrySeries(env, config);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row.sample_count).toBe(4);
    expect(row.avg_deltaT).toBeCloseTo(8, 5);
    expect(row.avg_thermalKW).toBeCloseTo((2 + 5 + 6 + 7) / 4, 5);
    expect(row.avg_supplyC).toBeCloseTo((40 + 46 + 47 + 48) / 4, 5);
    expect(row.avg_returnC).toBeCloseTo((38 + 39 + 40 + 41) / 4, 5);
  });
});
