import type { Env, User } from "../env";
import { maskTelemetryNumber } from "../telemetry";
import {
  TELEMETRY_ALLOWED_METRICS,
  TELEMETRY_INTERVALS_MS,
  type TelemetryLatestBatchInput,
  type TelemetrySeriesQuery,
} from "../schemas/telemetry";
import { parseFaultsJson } from "../utils";
import {
  buildDeviceLookup,
  buildDeviceScope,
  presentDeviceId,
  resolveDeviceId,
} from "./device";
import { userIsAdmin } from "./access";
import type { TelemetryLatestRow } from "./telemetry-store";

type TelemetryIncludeFlags = TelemetryLatestBatchInput["include"];
const SENSITIVE_PAYLOAD_KEYS = ["secret", "token", "password", "key", "signature", "auth"];

export interface LatestBatchRequestedDevice {
  token: string;
  index: number;
  resolved: string | null;
}

export interface LatestBatchResolution {
  scope: ReturnType<typeof buildDeviceScope>;
  requested: LatestBatchRequestedDevice[];
  resolvedIds: string[];
  missingTokens: string[];
}

export interface TelemetrySeriesConfig {
  bucketMs: number;
  startMs: number;
  endMs: number;
  metrics: (typeof TELEMETRY_ALLOWED_METRICS)[number][];
  whereClause: string;
  bindings: any[];
  scopeDescriptor: TelemetryScopeDescriptor;
  fillMode: "carry" | "none";
  tenantPrecision: number;
}

export type TelemetrySeriesConfigResult =
  | { ok: true; config: TelemetrySeriesConfig }
  | { ok: false; status: 400 | 403 | 404 | 500; error: string };

export interface DeviceScopeDescriptor {
  type: "device";
  device_id: string;
  lookup: string;
}

export interface ProfileScopeDescriptor {
  type: "profile";
  profile_ids: string[];
}

export interface FleetScopeDescriptor {
  type: "fleet";
  profile_ids: string[] | null;
}

export type TelemetryScopeDescriptor =
  | DeviceScopeDescriptor
  | ProfileScopeDescriptor
  | FleetScopeDescriptor;

export async function resolveLatestBatchDevices(
  env: Env,
  user: User,
  deviceTokens: string[],
): Promise<LatestBatchResolution> {
  const scope = buildDeviceScope(user);
  const requested: LatestBatchRequestedDevice[] = deviceTokens.map((token, index) => ({
    token,
    index,
    resolved: null,
  }));

  const missingTokens: string[] = [];
  if (!deviceTokens.length) {
    return { scope, requested, resolvedIds: [], missingTokens };
  }

  const resolutions = await Promise.all(
    requested.map((entry) => resolveDeviceId(entry.token, env, scope.isAdmin)),
  );
  resolutions.forEach((resolved, index) => {
    if (!resolved) {
      missingTokens.push(requested[index]!.token);
      return;
    }
    requested[index]!.resolved = resolved;
  });

  const resolvedIds = Array.from(
    new Set(requested.filter((candidate) => candidate.resolved).map((candidate) => candidate.resolved!)),
  );

  return { scope, requested, resolvedIds, missingTokens };
}

export async function presentLatestBatchRow(
  row: TelemetryLatestRow,
  env: Env,
  include: TelemetryIncludeFlags | undefined,
  user: User,
) {
  const isAdmin = userIsAdmin(user);
  const lookup = await buildDeviceLookup(row.device_id, env, isAdmin);
  const outwardId = presentDeviceId(row.device_id, isAdmin);
  const flags: TelemetryIncludeFlags = include ?? { faults: true, metrics: true };
  const includeMetrics = flags.metrics !== false;
  const includeFaults = flags.faults !== false;

  const latest: Record<string, unknown> = {
    ts: row.ts ?? null,
    updated_at: row.updated_at ?? null,
    online: row.latest_online === 1,
    mode: row.mode ?? null,
    defrost: row.defrost ?? null,
    cop_quality: row.cop_quality ?? null,
  };

  if (includeMetrics) {
    if (isAdmin) {
      const parsedPayload = safeParseJson(row.payload_json);
      const sanitized = parsedPayload === null ? null : sanitizeTelemetryPayload(parsedPayload);
      latest.payload = sanitized ?? null;
    }
    latest.supplyC = maskTelemetryNumber(row.supplyC, isAdmin);
    latest.returnC = maskTelemetryNumber(row.returnC, isAdmin);
    latest.tankC = maskTelemetryNumber(row.tankC, isAdmin);
    latest.ambientC = maskTelemetryNumber(row.ambientC, isAdmin);
    latest.flowLps = maskTelemetryNumber(row.flowLps, isAdmin, 3);
    latest.compCurrentA = maskTelemetryNumber(row.compCurrentA, isAdmin, 2);
    latest.eevSteps = maskTelemetryNumber(row.eevSteps, isAdmin, 0);
    latest.powerKW = maskTelemetryNumber(row.powerKW, isAdmin, 3);
    latest.deltaT = maskTelemetryNumber(row.deltaT, isAdmin, 2);
    latest.thermalKW = maskTelemetryNumber(row.thermalKW, isAdmin, 3);
    latest.cop = maskTelemetryNumber(row.cop, isAdmin, 2);
  } else if (isAdmin) {
    const parsedPayload = safeParseJson(row.payload_json);
    if (parsedPayload !== null) {
      const sanitized = sanitizeTelemetryPayload(parsedPayload);
      if (sanitized !== undefined) {
        latest.payload = sanitized;
      }
    }
  }

  if (includeFaults) {
    latest.faults = parseFaultsJson(row.faults_json);
  }

  return {
    lookup,
    device_id: outwardId,
    profile_id: row.profile_id ?? null,
    site: row.site ?? null,
    online: row.device_online === 1,
    last_seen_at: row.last_seen_at ?? null,
    latest,
  };
}

export async function resolveTelemetrySeriesConfig(
  params: TelemetrySeriesQuery,
  env: Env,
  user: User,
): Promise<TelemetrySeriesConfigResult> {
  const metrics = resolveMetrics(params.metric);
  if (!metrics.length) {
    return { ok: false, status: 400, error: "Invalid metrics" };
  }

  const bucketMs = resolveInterval(params.interval ?? "5m");
  if (!bucketMs) {
    return { ok: false, status: 400, error: "Invalid interval" };
  }

  const now = Date.now();
  const endMs = clampTimestamp(params.end, now);
  if (endMs === null) {
    return { ok: false, status: 400, error: "Invalid end timestamp" };
  }

  const defaultStart = endMs - 24 * 60 * 60 * 1000;
  let startMs = clampTimestamp(params.start, defaultStart);
  if (startMs === null) {
    return { ok: false, status: 400, error: "Invalid start timestamp" };
  }

  if (startMs >= endMs) {
    return { ok: false, status: 400, error: "Start must be before end" };
  }

  const limit = params.limit ?? 288;
  const maxWindow = limit * bucketMs;
  if (endMs - startMs > maxWindow) {
    startMs = endMs - maxWindow;
  }

  const scope = buildDeviceScope(user, "d");
  const isAdmin = scope.isAdmin;
  const fillMode = params.fill === "carry" ? "carry" : "none";
  const tenantPrecision = isAdmin ? 4 : 2;

  const conditions: string[] = ["t.ts BETWEEN params.start_ms AND params.end_ms"];
  const bindings: any[] = [];
  let scopeDescriptor: TelemetryScopeDescriptor;

  if (params.scope === "device") {
    if (!params.device) {
      return { ok: false, status: 400, error: "Device parameter is required for device scope" };
    }
    const resolvedId = await resolveDeviceId(params.device, env, isAdmin);
    if (!resolvedId) {
      return { ok: false, status: 404, error: "Device not found" };
    }

    const row = await env.DB
      .prepare(`SELECT device_id, profile_id FROM devices WHERE device_id = ?1 LIMIT 1`)
      .bind(resolvedId)
      .first<{ device_id: string; profile_id: string | null }>();
    if (!row) {
      return { ok: false, status: 404, error: "Device not found" };
    }

    if (!isAdmin) {
      const allowed = (scope.bind as string[]) ?? [];
      if (!allowed.includes(row.profile_id ?? "")) {
        return { ok: false, status: 403, error: "Forbidden" };
      }
    }

    conditions.push("t.device_id = ?");
    bindings.push(row.device_id);

    const outwardId = presentDeviceId(row.device_id, isAdmin);
    const lookup = await buildDeviceLookup(row.device_id, env, isAdmin);
    scopeDescriptor = { type: "device", device_id: outwardId, lookup };
  } else if (params.scope === "profile") {
    if (isAdmin) {
      if (!params.profile) {
        return { ok: false, status: 400, error: "Profile parameter is required for profile scope" };
      }
      conditions.push(buildInClause("d.profile_id", [params.profile]));
      bindings.push(params.profile);
      scopeDescriptor = { type: "profile", profile_ids: [params.profile] };
    } else {
      const allowed = (scope.bind as string[]) ?? [];
      if (!allowed.length) {
        conditions.push("1=0");
        scopeDescriptor = { type: "profile", profile_ids: [] };
      } else {
        let selected: string[];
        if (params.profile) {
          if (!allowed.includes(params.profile)) {
            return { ok: false, status: 403, error: "Forbidden" };
          }
          selected = [params.profile];
        } else if (allowed.length === 1) {
          selected = [...allowed];
        } else {
          return {
            ok: false,
            status: 400,
            error: "Profile parameter required for scoped users",
          };
        }
        conditions.push(buildInClause("d.profile_id", selected));
        bindings.push(...selected);
        scopeDescriptor = { type: "profile", profile_ids: selected };
      }
    }
  } else {
    if (isAdmin) {
      if (params.profile) {
        conditions.push(buildInClause("d.profile_id", [params.profile]));
        bindings.push(params.profile);
        scopeDescriptor = { type: "fleet", profile_ids: [params.profile] };
      } else {
        scopeDescriptor = { type: "fleet", profile_ids: null };
      }
    } else {
      const allowed = (scope.bind as string[]) ?? [];
      if (!allowed.length) {
        conditions.push("1=0");
        scopeDescriptor = { type: "fleet", profile_ids: [] };
      } else {
        let selected = [...allowed];
        if (params.profile) {
          if (!allowed.includes(params.profile)) {
            return { ok: false, status: 403, error: "Forbidden" };
          }
          selected = [params.profile];
        }
        conditions.push(buildInClause("d.profile_id", selected));
        bindings.push(...selected);
        scopeDescriptor = { type: "fleet", profile_ids: selected };
      }
    }
  }

  if (!isAdmin && scope.clause) {
    conditions.push(scope.clause);
    bindings.push(...scope.bind);
  }

  const whereClause = conditions.join(" AND ");

  return {
    ok: true,
    config: {
      bucketMs,
      startMs,
      endMs,
      metrics,
      whereClause,
      bindings,
      scopeDescriptor,
      fillMode,
      tenantPrecision,
    },
  };
}

function resolveMetrics(csv: string | undefined | null) {
  if (!csv) return [...TELEMETRY_ALLOWED_METRICS];
  const parts = csv
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean) as (typeof TELEMETRY_ALLOWED_METRICS)[number][];
  const allowed = new Set(TELEMETRY_ALLOWED_METRICS);
  return parts.filter((part) => allowed.has(part));
}

function resolveInterval(interval: string | undefined) {
  if (!interval) return TELEMETRY_INTERVALS_MS["5m"];
  return TELEMETRY_INTERVALS_MS[interval] ?? null;
}

function clampTimestamp(value: string | number | null | undefined, fallback: number): number | null {
  if (value == null) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (!trimmed) return fallback;
  if (/^\d+$/.test(trimmed)) {
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildInClause(column: string, values: string[]) {
  if (!values.length) return "1=0";
  const placeholders = values.map(() => "?").join(",");
  return `${column} IN (${placeholders})`;
}

function sanitizeTelemetryPayload(payload: unknown, depth = 0): unknown {
  if (payload === null) return null;
  if (depth >= 6) return null;

  if (Array.isArray(payload)) {
    const items = payload
      .slice(0, 50)
      .map((item) => sanitizeTelemetryPayload(item, depth + 1))
      .filter((item) => item !== undefined);
    return items;
  }

  if (typeof payload === "object") {
    const entries = Object.entries(payload as Record<string, unknown>);
    const result: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      if (!key) continue;
      const normalized = key.toLowerCase();
      if (SENSITIVE_PAYLOAD_KEYS.some((fragment) => normalized.includes(fragment))) {
        result[key] = "[redacted]";
        continue;
      }
      const sanitized = sanitizeTelemetryPayload(value, depth + 1);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result;
  }

  if (typeof payload === "string") {
    if (!payload.trim()) return "";
    return payload.length > 512 ? `${payload.slice(0, 509)}...` : payload;
  }

  if (typeof payload === "number" || typeof payload === "boolean") {
    return payload;
  }

  return undefined;
}

function safeParseJson(payload: string | null | undefined) {
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
