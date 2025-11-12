import { afterEach, describe, expect, it } from "vitest";

import type { User } from "../../env";
import { sealCursorId } from "../cursor";
import {
  presentLatestBatchRow,
  resolveLatestBatchDevices,
  resolveTelemetrySeriesConfig,
} from "../telemetry-access";
import { fetchLatestTelemetryBatch } from "../telemetry-store";
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

describe("telemetry-access", () => {
  let closeDb: (() => void) | null = null;

  afterEach(() => {
    if (closeDb) {
      closeDb();
      closeDb = null;
    }
  });

  it("resolves device tokens and captures missing entries", async () => {
    const { env, sqlite } = createTelemetryTestEnv();
    closeDb = () => sqlite.close();

    const adminResolution = await resolveLatestBatchDevices(env, ADMIN_USER, [
      "dev-1001",
      "missing-device",
    ]);
    expect(adminResolution.scope.isAdmin).toBe(true);
    expect(adminResolution.resolvedIds).toEqual(["dev-1001", "missing-device"]);
    expect(adminResolution.missingTokens).toEqual([]);

    const lookup = await sealCursorId(env, "dev-1001");
    const tenantResolution = await resolveLatestBatchDevices(env, TENANT_USER, [
      lookup,
      "plain-miss",
    ]);
    expect(tenantResolution.scope.isAdmin).toBe(false);
    expect(tenantResolution.resolvedIds).toEqual(["dev-1001"]);
    expect(tenantResolution.missingTokens).toEqual(["plain-miss"]);
  });

  it("presents latest rows with masking for tenant users", async () => {
    const { env, sqlite } = createTelemetryTestEnv();
    closeDb = () => sqlite.close();

    const adminResolution = await resolveLatestBatchDevices(env, ADMIN_USER, ["dev-1001"]);
    const [row] = await fetchLatestTelemetryBatch(
      env,
      adminResolution.resolvedIds,
      adminResolution.scope,
    );
    expect(row).toBeDefined();

    const presented = await presentLatestBatchRow(row, env, undefined, TENANT_USER);
    expect(presented.device_id).not.toBe("dev-1001");
    expect(presented.lookup).not.toBe("dev-1001");
    expect(presented.latest).toMatchObject({
      faults: expect.any(Array),
      supplyC: expect.any(Number),
    });
  });

  it("builds series config enforcing RBAC rules", async () => {
    const { env, sqlite } = createTelemetryTestEnv();
    closeDb = () => sqlite.close();

    const base = Date.UTC(2025, 0, 1, 10, 0, 0);
    await insertTelemetrySamples(env, "dev-1001", [
      {
        ts: base,
        deltaT: 4,
        thermalKW: 3.8,
        cop: 3.2,
        supplyC: 44,
        returnC: 39,
        flowLps: 0.29,
        powerKW: 1.4,
      },
    ]);

    const adminQuery = {
      scope: "device",
      device: "dev-1001",
      interval: "5m",
      start: new Date(base - 60_000).toISOString(),
      end: new Date(base + 60_000).toISOString(),
    } as const;

    const adminConfig = await resolveTelemetrySeriesConfig(adminQuery, env, ADMIN_USER);
    expect(adminConfig.ok).toBe(true);
    if (adminConfig.ok) {
      expect(adminConfig.config.scopeDescriptor).toMatchObject({
        type: "device",
        device_id: "dev-1001",
      });
      expect(adminConfig.config.bindings).toContain("dev-1001");
      expect(adminConfig.config.tenantPrecision).toBe(4);
    }

    const tenantQuery = {
      scope: "profile",
      profile: "profile-east",
      interval: "5m",
      start: new Date(base - 60_000).toISOString(),
      end: new Date(base + 60_000).toISOString(),
    } as const;

    const tenantResult = await resolveTelemetrySeriesConfig(tenantQuery, env, TENANT_USER);
    expect(tenantResult.ok).toBe(false);
    if (!tenantResult.ok) {
      expect(tenantResult.status).toBe(403);
    }
  });
});
