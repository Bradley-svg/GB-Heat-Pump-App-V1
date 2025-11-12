import type { Env } from "../env";
import { claimDeviceIfUnowned, verifyDeviceKey } from "../lib/device";
import { json } from "../utils/responses";
import { evaluateCors, withCors } from "../lib/cors";
import { checkIpRateLimit } from "../lib/ip-rate-limit";
import {
  parseAndCheckTs,
  nowISO,
  hmacSha256Hex,
  timingSafeEqual,
} from "../utils";
import { validationErrorResponse } from "../utils/validation";
import { HeartbeatPayloadSchema, TelemetryPayloadSchema } from "../schemas/ingest";
import type { HeartbeatPayload, TelemetryPayload } from "../schemas/ingest";
import { deriveTelemetryMetrics } from "../telemetry";
import { ingestDedupWindowMs } from "../utils/ingest-dedup";
import { loggerForRequest, type Logger } from "../utils/logging";
import { recordOpsMetric } from "../lib/ops-metrics";
import { markRequestMetricsRecorded } from "../lib/request-metrics";
import { withTransaction } from "../lib/db";
import {
  DASHBOARD_CACHE_AREA,
  bumpDashboardTokens,
  scopeIdsForProfiles,
} from "../lib/dashboard-cache";

const DEVICE_KEY_HEADER = "X-GREENBRO-DEVICE-KEY";
const SIGNATURE_HEADER = "X-GREENBRO-SIGNATURE";
const TIMESTAMP_HEADER = "X-GREENBRO-TIMESTAMP";
const RAW_INGEST_ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);
const INGEST_ROUTE = "/api/ingest";
const HEARTBEAT_ROUTE = "/api/heartbeat";

async function invalidateDashboardCaches(
  env: Env,
  profileId: string | null | undefined,
  logger: Logger,
): Promise<void> {
  const scopeIds = scopeIdsForProfiles([profileId]);
  try {
    await bumpDashboardTokens(env, DASHBOARD_CACHE_AREA.clientCompact, scopeIds);
  } catch (error) {
    logger.warn("dashboard.cache_invalidation_failed", {
      area: DASHBOARD_CACHE_AREA.clientCompact,
      profile_id: profileId,
      error,
    });
  }
  try {
    await bumpDashboardTokens(env, DASHBOARD_CACHE_AREA.archiveOffline, scopeIds);
  } catch (error) {
    logger.warn("dashboard.cache_invalidation_failed", {
      area: DASHBOARD_CACHE_AREA.archiveOffline,
      profile_id: profileId,
      error,
    });
  }
}

const textEncoder = new TextEncoder();

type SignatureValidation =
  | { ok: true }
  | { ok: false; status: number; error: string };

function signatureToleranceMs(env: Env) {
  const raw = env.INGEST_SIGNATURE_TOLERANCE_SECS;
  const parsed = raw ? Number(raw) : NaN;
  const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
  return seconds * 1000;
}

function parseSignatureTimestamp(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{10,}$/.test(value)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    if (value.length <= 10) {
      return numeric * 1000;
    }
    return numeric;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseNonNegativeInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function parsedRateLimit(env: Env): number {
  return parsePositiveInt(env.INGEST_RATE_LIMIT_PER_MIN, 120);
}

function parsedFailureLimit(env: Env, overallLimit: number): number {
  const explicit = parseNonNegativeInt(env.INGEST_FAILURE_LIMIT_PER_MIN, -1);
  if (explicit >= 0) {
    return explicit;
  }
  if (overallLimit > 0) {
    return Math.max(10, Math.floor(overallLimit / 2));
  }
  return 0;
}

async function isRateLimited(
  env: Env,
  route: string,
  deviceId: string,
  limitPerMinute: number,
) {
  if (limitPerMinute <= 0) return false;
  const sinceIso = new Date(Date.now() - 60_000).toISOString();
  const row = await env.DB
    .prepare(
      `SELECT COUNT(*) AS cnt
         FROM ops_metrics
        WHERE device_id = ?1
          AND route = ?2
          AND ts >= ?3`,
    )
    .bind(deviceId, route, sinceIso)
    .first<{ cnt: number | string | null }>();
  const rawCount = row?.cnt ?? 0;
  const count = typeof rawCount === "number" ? rawCount : Number(rawCount);
  return Number.isFinite(count) && count >= limitPerMinute;
}

async function isFailureRateLimited(
  env: Env,
  route: string,
  deviceId: string,
  failureLimitPerMinute: number,
) {
  if (failureLimitPerMinute <= 0) return false;
  const sinceIso = new Date(Date.now() - 60_000).toISOString();
  const row = await env.DB
    .prepare(
      `SELECT COUNT(*) AS cnt
         FROM ops_metrics
        WHERE device_id = ?1
          AND route = ?2
          AND ts >= ?3
          AND status_code >= 400`,
    )
    .bind(deviceId, route, sinceIso)
    .first<{ cnt: number | string | null }>();
  const rawCount = row?.cnt ?? 0;
  const count = typeof rawCount === "number" ? rawCount : Number(rawCount);
  return Number.isFinite(count) && count >= failureLimitPerMinute;
}

function isNonceConflict(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error ? error.message :
    typeof error === "string" ? error :
    "";
  if (!message) return false;
  return (
    message.includes("ingest_nonces") &&
    message.toLowerCase().includes("unique constraint failed")
  );
}

async function ensureSignature(
  req: Request,
  env: Env,
  payload: string,
  deviceKeyHash: string,
): Promise<SignatureValidation> {
  const signatureHeader = req.headers.get(SIGNATURE_HEADER);
  const timestampHeader = req.headers.get(TIMESTAMP_HEADER);
  if (!signatureHeader || !timestampHeader) {
    return { ok: false, status: 401, error: "Missing signature headers" };
  }

  const trimmedTimestamp = timestampHeader.trim();
  const normalizedSignature = signatureHeader.trim().toLowerCase();
  if (!trimmedTimestamp) {
    return { ok: false, status: 400, error: "Invalid signature timestamp" };
  }
  if (!normalizedSignature) {
    return { ok: false, status: 401, error: "Invalid signature" };
  }

  const tsMs = parseSignatureTimestamp(trimmedTimestamp);
  if (tsMs === null) {
    return { ok: false, status: 400, error: "Invalid signature timestamp" };
  }

  const toleranceMs = signatureToleranceMs(env);
  if (Math.abs(Date.now() - tsMs) > toleranceMs) {
    return {
      ok: false,
      status: 401,
      error: "Signature timestamp outside tolerance",
    };
  }

  const expected = await hmacSha256Hex(deviceKeyHash, `${trimmedTimestamp}.${payload}`);
  if (!timingSafeEqual(expected, normalizedSignature)) {
    return { ok: false, status: 401, error: "Invalid signature" };
  }

  return { ok: true };
}

function readRawBody(raw: string): unknown {
  if (!raw) return null;
  return JSON.parse(raw);
}

function payloadSizeOk(raw: string) {
  return textEncoder.encode(raw).length <= 256_000;
}

type EarlyExitLevel = "info" | "warn" | "error";

async function logAndRecordEarlyExit(
  req: Request,
  env: Env,
  route: string,
  statusCode: number,
  t0: number,
  log: Logger,
  event: string,
  options: {
    deviceId?: string | null;
    level?: EarlyExitLevel;
    fields?: Record<string, unknown>;
  } = {},
) {
  const { deviceId = null, level, fields } = options;
  const scopedLog = deviceId ? log.with({ device_id: deviceId }) : log;
  await recordOpsMetric(env, route, statusCode, Date.now() - t0, deviceId, scopedLog);
  markRequestMetricsRecorded(req);
  const severity: EarlyExitLevel =
    level ?? (statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info");
  const payload = { status_code: statusCode, ...(fields ?? {}) };
  if (severity === "error") {
    scopedLog.error(event, payload);
  } else if (severity === "info") {
    scopedLog.info(event, payload);
  } else {
    scopedLog.warn(event, payload);
  }
}

export async function handleIngest(req: Request, env: Env, profileId: string) {
  const t0 = Date.now();
  const log = loggerForRequest(req, { route: `${INGEST_ROUTE}/:profile`, profile_id: profileId });
  const cors = evaluateCors(req, env);
  if (!cors.allowed) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 403, t0, log, "ingest.cors_blocked", {
      fields: { reason: "origin_not_allowed", origin: cors.origin },
      level: "warn",
    });
    return json({ error: "Origin not allowed" }, { status: 403 });
  }

  if (!isRawIngestEnabled(env)) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 410, t0, log, "ingest.raw_disabled", {
      fields: { reason: "raw_ingest_disabled" },
      level: "info",
    });
    return withCors(req, env, json({ error: "raw_ingest_disabled" }, { status: 410 }), cors);
  }

  const ipDecision = await checkIpRateLimit(req, env, INGEST_ROUTE);
  if (ipDecision?.limited) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 429, t0, log, "ingest.ip_rate_limited", {
      fields: {
        reason: "ip_rate_limited",
        limit_per_minute: ipDecision.limit,
        retry_after_seconds: ipDecision.retryAfterSeconds,
      },
      level: "warn",
    });
    const rateResponse = json({ error: "Rate limit exceeded" }, { status: 429 });
    if (ipDecision.retryAfterSeconds != null) {
      rateResponse.headers.set("Retry-After", String(ipDecision.retryAfterSeconds));
    }
    return withCors(req, env, rateResponse, cors);
  }

  let rawBodyText: string;
  try {
    rawBodyText = await req.text();
  } catch (error) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 400, t0, log, "ingest.body_read_failed", {
      fields: { reason: "invalid_json", error },
      level: "warn",
    });
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }

  if (!payloadSizeOk(rawBodyText)) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 413, t0, log, "ingest.payload_too_large", {
      fields: { reason: "payload_too_large" },
    });
    return withCors(req, env, json({ error: "Payload too large" }, { status: 413 }), cors);
  }

  let rawBody: unknown;
  try {
    rawBody = readRawBody(rawBodyText);
  } catch (error) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 400, t0, log, "ingest.invalid_json", {
      fields: { reason: "invalid_json", error },
      level: "warn",
    });
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }

  const parsedBody = TelemetryPayloadSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 400, t0, log, "ingest.validation_failed", {
      fields: {
        reason: "validation_failed",
        issue_count: parsedBody.error.issues.length,
      },
    });
    return withCors(req, env, validationErrorResponse(parsedBody.error), cors);
  }
  const body: TelemetryPayload = parsedBody.data;

  const tsCheck = parseAndCheckTs(body.ts);
  if (!tsCheck.ok) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 400, t0, log, "ingest.invalid_timestamp", {
      deviceId: body.device_id,
      fields: { reason: tsCheck.reason },
    });
    return withCors(req, env, json({ error: tsCheck.reason }, { status: 400 }), cors);
  }
  const tsMs = tsCheck.ms!;

  const limitPerMinute = parsedRateLimit(env);
  const failureLimitPerMinute = parsedFailureLimit(env, limitPerMinute);

  if (
    await isFailureRateLimited(env, INGEST_ROUTE, body.device_id, failureLimitPerMinute)
  ) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 429, t0, log, "ingest.failure_rate_limited", {
      deviceId: body.device_id,
      fields: {
        reason: "failure_rate_limited",
        failure_limit_per_minute: failureLimitPerMinute,
      },
    });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }

  if (await isRateLimited(env, INGEST_ROUTE, body.device_id, limitPerMinute)) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 429, t0, log, "ingest.rate_limited", {
      deviceId: body.device_id,
      fields: { reason: "rate_limited", limit_per_minute: limitPerMinute },
    });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }

  const keyHeader = req.headers.get(DEVICE_KEY_HEADER);
  const keyVerification = await verifyDeviceKey(env, body.device_id, keyHeader);
  if (!keyVerification.ok || !keyVerification.deviceKeyHash) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 401, t0, log, "ingest.unauthorized_device_key", {
      deviceId: body.device_id,
      fields: { reason: "invalid_device_key" },
    });
    return withCors(req, env, json({ error: "Unauthorized" }, { status: 401 }), cors);
  }

  const signatureCheck = await ensureSignature(req, env, rawBodyText, keyVerification.deviceKeyHash);
  if (!signatureCheck.ok) {
    await logAndRecordEarlyExit(
      req,
      env,
      INGEST_ROUTE,
      signatureCheck.status,
      t0,
      log,
      "ingest.signature_failure",
      {
        deviceId: body.device_id,
        fields: { reason: signatureCheck.error },
      },
    );
    return withCors(
      req,
      env,
      json({ error: signatureCheck.error }, { status: signatureCheck.status }),
      cors,
    );
  }

  const devRow = await env.DB
    .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1`)
    .bind(body.device_id)
    .first<{ profile_id?: string | null }>();

  if (!devRow) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 401, t0, log, "ingest.unknown_device", {
      deviceId: body.device_id,
      fields: { reason: "unknown_device" },
    });
    return withCors(
      req,
      env,
      json({ error: "Unauthorized (unknown device)" }, { status: 401 }),
      cors,
    );
  }

  if (devRow.profile_id && devRow.profile_id !== profileId) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 409, t0, log, "ingest.profile_mismatch", {
      deviceId: body.device_id,
      fields: {
        reason: "profile_mismatch",
        db_profile_id: devRow.profile_id,
        requested_profile_id: profileId,
      },
    });
    return withCors(
      req,
      env,
      json({ error: "Profile mismatch for device" }, { status: 409 }),
      cors,
    );
  }

  if (!devRow.profile_id) {
    const claim = await claimDeviceIfUnowned(env, body.device_id, profileId);
    if (!claim.ok && claim.reason === "claimed_by_other") {
      await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 409, t0, log, "ingest.claim_conflict", {
        deviceId: body.device_id,
        fields: { reason: "claim_conflict" },
      });
      return withCors(
        req,
        env,
        json({ error: "Profile mismatch for device" }, { status: 409 }),
        cors,
      );
    }
  }
  const effectiveProfileId = devRow.profile_id ?? profileId;

  const supply = typeof body.metrics.supplyC === "number" ? body.metrics.supplyC : null;
  const ret = typeof body.metrics.returnC === "number" ? body.metrics.returnC : null;
  const flow = typeof body.metrics.flowLps === "number" ? body.metrics.flowLps : null;
  const powerKW = typeof body.metrics.powerKW === "number" ? body.metrics.powerKW : null;

  const { deltaT, thermalKW, cop, cop_quality } = deriveTelemetryMetrics({
    supplyC: supply,
    returnC: ret,
    flowLps: flow,
    powerKW,
  });

  const sanitizedMetricsJson = JSON.stringify(body.metrics);
  const faults_json = JSON.stringify(body.faults || []);
  const status_json = JSON.stringify({
    mode: body.metrics.mode ?? null,
    defrost: body.metrics.defrost ?? 0,
    rssi: body.rssi ?? null,
  });

  const dedupWindowMs = ingestDedupWindowMs(env);
  const dedupExpiresAt = tsMs + dedupWindowMs;
  const dedupCleanupCutoff = Date.now();

  try {
    const updatedAtIso = nowISO();
    const lastSeenIso = new Date(tsMs).toISOString();

    await withTransaction(env.DB, async () => {
      await env.DB
        .prepare(
          `DELETE FROM ingest_nonces WHERE device_id = ?1 AND ts_ms = ?2 AND expires_at < ?3`,
        )
        .bind(body.device_id, tsMs, dedupCleanupCutoff)
        .run();

      await env.DB
        .prepare(
          `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
           ON CONFLICT (device_id, ts) DO NOTHING`,
        )
        .bind(
          body.device_id,
          tsMs,
          sanitizedMetricsJson,
          deltaT,
          thermalKW,
          cop,
          cop_quality,
          status_json,
          faults_json,
        )
        .run();

      await env.DB
        .prepare(
          `INSERT INTO latest_state
             (device_id, ts, supplyC, returnC, tankC, ambientC, flowLps, compCurrentA, eevSteps, powerKW,
              deltaT, thermalKW, cop, cop_quality, mode, defrost, online, payload_json, faults_json, updated_at)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,1,?17,?18,?19)
           ON CONFLICT(device_id) DO UPDATE SET
              ts=excluded.ts, supplyC=excluded.supplyC, returnC=excluded.returnC, tankC=excluded.tankC,
              ambientC=excluded.ambientC, flowLps=excluded.flowLps, compCurrentA=excluded.compCurrentA,
              eevSteps=excluded.eevSteps, powerKW=excluded.powerKW, deltaT=excluded.deltaT,
              thermalKW=excluded.thermalKW, cop=excluded.cop, cop_quality=excluded.cop_quality,
              mode=excluded.mode, defrost=excluded.defrost, online=1, payload_json=excluded.payload_json,
              faults_json=excluded.faults_json, updated_at=excluded.updated_at`,
        )
        .bind(
          body.device_id,
          tsMs,
          supply,
          ret,
          body.metrics.tankC ?? null,
          body.metrics.ambientC ?? null,
          flow,
          body.metrics.compCurrentA ?? null,
          body.metrics.eevSteps ?? null,
          body.metrics.powerKW ?? null,
          deltaT,
          thermalKW,
          cop,
          cop_quality,
          body.metrics.mode ?? null,
          body.metrics.defrost ?? 0,
          sanitizedMetricsJson,
          faults_json,
          updatedAtIso,
        )
        .run();

      await env.DB
        .prepare(`UPDATE devices SET online=1, last_seen_at=?2 WHERE device_id=?1`)
        .bind(body.device_id, lastSeenIso)
        .run();

      await env.DB
        .prepare(`INSERT INTO ingest_nonces (device_id, ts_ms, expires_at) VALUES (?1, ?2, ?3)`)
        .bind(body.device_id, tsMs, dedupExpiresAt)
        .run();
    });

    const deviceLog = log.with({ device_id: body.device_id });
    await invalidateDashboardCaches(env, effectiveProfileId, deviceLog);
    await recordOpsMetric(env, INGEST_ROUTE, 200, Date.now() - t0, body.device_id, deviceLog);
    markRequestMetricsRecorded(req);
    deviceLog.info("ingest.telemetry_stored", {
      payload_ts: new Date(tsMs).toISOString(),
      faults_count: body.faults?.length ?? 0,
      delta_t: deltaT,
      thermal_kw: thermalKW,
      cop,
    });
    return withCors(req, env, json({ ok: true }), cors);
  } catch (e: any) {
    if (isNonceConflict(e)) {
      await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 409, t0, log, "ingest.duplicate_payload", {
        deviceId: body.device_id,
        fields: {
          reason: "duplicate_payload",
          payload_ts: new Date(tsMs).toISOString(),
          dedup_window_ms: dedupWindowMs,
        },
      });
      return withCors(
        req,
        env,
        json({ error: "Duplicate payload" }, { status: 409 }),
        cors,
      );
    }

    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 500, t0, log, "ingest.db_error", {
      deviceId: body.device_id,
      level: "error",
      fields: { reason: "db_error", error: e },
    });
    return withCors(
      req,
      env,
      json({ error: "DB error" }, { status: 500 }),
      cors,
    );
  }
}

export async function handleHeartbeat(req: Request, env: Env, profileId: string) {
  const t0 = Date.now();
  const log = loggerForRequest(req, { route: `${HEARTBEAT_ROUTE}/:profile`, profile_id: profileId });
  const cors = evaluateCors(req, env);
  if (!cors.allowed) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 403, t0, log, "heartbeat.cors_blocked", {
      fields: { reason: "origin_not_allowed", origin: cors.origin },
      level: "warn",
    });
    return json({ error: "Origin not allowed" }, { status: 403 });
  }

  const ipDecision = await checkIpRateLimit(req, env, HEARTBEAT_ROUTE);
  if (ipDecision?.limited) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 429, t0, log, "heartbeat.ip_rate_limited", {
      fields: {
        reason: "ip_rate_limited",
        limit_per_minute: ipDecision.limit,
        retry_after_seconds: ipDecision.retryAfterSeconds,
      },
      level: "warn",
    });
    const rateResponse = json({ error: "Rate limit exceeded" }, { status: 429 });
    if (ipDecision.retryAfterSeconds != null) {
      rateResponse.headers.set("Retry-After", String(ipDecision.retryAfterSeconds));
    }
    return withCors(req, env, rateResponse, cors);
  }

  let rawBodyText: string;
  try {
    rawBodyText = await req.text();
  } catch (error) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 400, t0, log, "heartbeat.body_read_failed", {
      fields: { reason: "invalid_json", error },
      level: "warn",
    });
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }

  if (!payloadSizeOk(rawBodyText)) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 413, t0, log, "heartbeat.payload_too_large", {
      fields: { reason: "payload_too_large" },
    });
    return withCors(req, env, json({ error: "Payload too large" }, { status: 413 }), cors);
  }

  let rawBody: unknown;
  try {
    rawBody = readRawBody(rawBodyText);
  } catch (error) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 400, t0, log, "heartbeat.invalid_json", {
      fields: { reason: "invalid_json", error },
      level: "warn",
    });
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }

  const parsedBody = HeartbeatPayloadSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 400, t0, log, "heartbeat.validation_failed", {
      fields: {
        reason: "validation_failed",
        issue_count: parsedBody.error.issues.length,
      },
    });
    return withCors(req, env, validationErrorResponse(parsedBody.error), cors);
  }
  const body: HeartbeatPayload = parsedBody.data;

  const tsStr = body.ts ?? new Date().toISOString();
  const tsCheck = parseAndCheckTs(tsStr);
  if (!tsCheck.ok) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 400, t0, log, "heartbeat.invalid_timestamp", {
      deviceId: body.device_id,
      fields: { reason: tsCheck.reason },
    });
    return withCors(req, env, json({ error: tsCheck.reason }, { status: 400 }), cors);
  }

  const heartRateLimit = parsedRateLimit(env);
  const heartFailureLimit = parsedFailureLimit(env, heartRateLimit);

  if (
    await isFailureRateLimited(env, HEARTBEAT_ROUTE, body.device_id, heartFailureLimit)
  ) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 429, t0, log, "heartbeat.failure_rate_limited", {
      deviceId: body.device_id,
      fields: {
        reason: "failure_rate_limited",
        failure_limit_per_minute: heartFailureLimit,
      },
    });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }

  if (await isRateLimited(env, HEARTBEAT_ROUTE, body.device_id, heartRateLimit)) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 429, t0, log, "heartbeat.rate_limited", {
      deviceId: body.device_id,
      fields: { reason: "rate_limited", limit_per_minute: heartRateLimit },
    });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }

  const keyHeader = req.headers.get(DEVICE_KEY_HEADER);
  const keyVerification = await verifyDeviceKey(env, body.device_id, keyHeader);
  if (!keyVerification.ok || !keyVerification.deviceKeyHash) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 401, t0, log, "heartbeat.unauthorized_device_key", {
      deviceId: body.device_id,
      fields: { reason: "invalid_device_key" },
    });
    return withCors(req, env, json({ error: "Unauthorized" }, { status: 401 }), cors);
  }

  const signatureCheck = await ensureSignature(req, env, rawBodyText, keyVerification.deviceKeyHash);
  if (!signatureCheck.ok) {
    await logAndRecordEarlyExit(
      req,
      env,
      HEARTBEAT_ROUTE,
      signatureCheck.status,
      t0,
      log,
      "heartbeat.signature_failure",
      {
        deviceId: body.device_id,
        fields: { reason: signatureCheck.error },
      },
    );
    return withCors(
      req,
      env,
      json({ error: signatureCheck.error }, { status: signatureCheck.status }),
      cors,
    );
  }

  const devRow = await env.DB
    .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1`)
    .bind(body.device_id)
    .first<{ profile_id?: string | null }>();

  if (!devRow) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 401, t0, log, "heartbeat.unknown_device", {
      deviceId: body.device_id,
      fields: { reason: "unknown_device" },
    });
    return withCors(
      req,
      env,
      json({ error: "Unauthorized (unknown device)" }, { status: 401 }),
      cors,
    );
  }

  if (devRow.profile_id && devRow.profile_id !== profileId) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 409, t0, log, "heartbeat.profile_mismatch", {
      deviceId: body.device_id,
      fields: {
        reason: "profile_mismatch",
        db_profile_id: devRow.profile_id,
        requested_profile_id: profileId,
      },
    });
    return withCors(
      req,
      env,
      json({ error: "Profile mismatch for device" }, { status: 409 }),
      cors,
    );
  }

  if (!devRow.profile_id) {
    const claim = await claimDeviceIfUnowned(env, body.device_id, profileId);
    if (!claim.ok && claim.reason === "claimed_by_other") {
      await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 409, t0, log, "heartbeat.claim_conflict", {
        deviceId: body.device_id,
        fields: { reason: "claim_conflict" },
      });
      return withCors(
        req,
        env,
        json({ error: "Profile mismatch for device" }, { status: 409 }),
        cors,
      );
    }
  }
  const effectiveProfileId = devRow.profile_id ?? profileId;

  const limitPerMinute = parsedRateLimit(env);
  if (await isRateLimited(env, HEARTBEAT_ROUTE, body.device_id, limitPerMinute)) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 429, t0, log, "heartbeat.rate_limited", {
      deviceId: body.device_id,
      fields: { reason: "rate_limited", limit_per_minute: limitPerMinute },
    });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }

  const tsMs = tsCheck.ms ?? Date.now();

  try {
    const updatedIso = new Date(tsMs).toISOString();
    await withTransaction(env.DB, async () => {
      await env.DB
        .prepare(
          `UPDATE latest_state
              SET online=1, updated_at=?2, faults_json='[]'
            WHERE device_id=?1`,
        )
        .bind(body.device_id, updatedIso)
        .run();

      await env.DB
        .prepare(`UPDATE devices SET online=1, last_seen_at=?2 WHERE device_id=?1`)
        .bind(body.device_id, updatedIso)
        .run();
    });

    const deviceLog = log.with({ device_id: body.device_id });
    await invalidateDashboardCaches(env, effectiveProfileId, deviceLog);
    await recordOpsMetric(env, HEARTBEAT_ROUTE, 200, Date.now() - t0, body.device_id, deviceLog);
    markRequestMetricsRecorded(req);
    deviceLog.info("heartbeat.accepted", { payload_ts: new Date(tsMs).toISOString() });
    return withCors(req, env, json({ ok: true, server_time: new Date().toISOString() }), cors);
  } catch (e) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 500, t0, log, "heartbeat.db_error", {
      deviceId: body.device_id,
      level: "error",
      fields: { reason: "db_error", error: e },
    });
    return withCors(req, env, json({ error: "DB error" }, { status: 500 }), cors);
  }
}
function isRawIngestEnabled(env: Env): boolean {
  const raw = typeof env.ALLOW_RAW_INGEST === "string" ? env.ALLOW_RAW_INGEST.trim().toLowerCase() : "";
  return RAW_INGEST_ENABLED_VALUES.has(raw);
}
