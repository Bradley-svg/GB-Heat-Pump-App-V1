import type { Env } from "../env";
import { claimDeviceIfUnowned, verifyDeviceKey } from "../lib/device";
import { json } from "../utils/responses";
import { evaluateCors, withCors } from "../lib/cors";
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
import { loggerForRequest } from "../utils/logging";
import { recordOpsMetric } from "../lib/ops-metrics";

const DEVICE_KEY_HEADER = "X-GREENBRO-DEVICE-KEY";
const SIGNATURE_HEADER = "X-GREENBRO-SIGNATURE";
const TIMESTAMP_HEADER = "X-GREENBRO-TIMESTAMP";
const INGEST_ROUTE = "/api/ingest";
const HEARTBEAT_ROUTE = "/api/heartbeat";

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

function parsedRateLimit(env: Env): number {
  const raw = env.INGEST_RATE_LIMIT_PER_MIN;
  if (!raw) return 120;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 120;
  if (parsed <= 0) return 0;
  return Math.floor(parsed);
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
      `SELECT COUNT(*) AS cnt FROM ops_metrics WHERE device_id = ?1 AND route = ?2 AND ts >= ?3`,
    )
    .bind(deviceId, route, sinceIso)
    .first<{ cnt: number | string | null }>();
  const rawCount = row?.cnt ?? 0;
  const count = typeof rawCount === "number" ? rawCount : Number(rawCount);
  return Number.isFinite(count) && count >= limitPerMinute;
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

export async function handleIngest(req: Request, env: Env, profileId: string) {
  const t0 = Date.now();
  const log = loggerForRequest(req, { route: `${INGEST_ROUTE}/:profile`, profile_id: profileId });
  const cors = evaluateCors(req, env);
  if (!cors.allowed) {
    return json({ error: "Origin not allowed" }, { status: 403 });
  }

  let rawBodyText: string;
  try {
    rawBodyText = await req.text();
  } catch {
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }

  if (!payloadSizeOk(rawBodyText)) {
    return withCors(req, env, json({ error: "Payload too large" }, { status: 413 }), cors);
  }

  let rawBody: unknown;
  try {
    rawBody = readRawBody(rawBodyText);
  } catch {
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }

  const parsedBody = TelemetryPayloadSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return withCors(req, env, validationErrorResponse(parsedBody.error), cors);
  }
  const body: TelemetryPayload = parsedBody.data;

  const tsCheck = parseAndCheckTs(body.ts);
  if (!tsCheck.ok) {
    return withCors(req, env, json({ error: tsCheck.reason }, { status: 400 }), cors);
  }
  const tsMs = tsCheck.ms!;

  const keyHeader = req.headers.get(DEVICE_KEY_HEADER);
  const keyVerification = await verifyDeviceKey(env, body.device_id, keyHeader);
  if (!keyVerification.ok || !keyVerification.deviceKeyHash) {
    return withCors(req, env, json({ error: "Unauthorized" }, { status: 401 }), cors);
  }

  const signatureCheck = await ensureSignature(req, env, rawBodyText, keyVerification.deviceKeyHash);
  if (!signatureCheck.ok) {
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
    return withCors(
      req,
      env,
      json({ error: "Unauthorized (unknown device)" }, { status: 401 }),
      cors,
    );
  }

  if (devRow.profile_id && devRow.profile_id !== profileId) {
    log
      .with({
        device_id: body.device_id,
        db_profile_id: devRow.profile_id,
        requested_profile_id: profileId,
      })
      .warn("ingest.profile_mismatch");
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
      return withCors(
        req,
        env,
        json({ error: "Profile mismatch for device" }, { status: 409 }),
        cors,
      );
    }
  }

  const deviceLog = log.with({ device_id: body.device_id });
  const limitPerMinute = parsedRateLimit(env);
  if (await isRateLimited(env, INGEST_ROUTE, body.device_id, limitPerMinute)) {
    await recordOpsMetric(
      env,
      INGEST_ROUTE,
      429,
      Date.now() - t0,
      body.device_id,
      deviceLog,
    );
    deviceLog.warn("ingest.rate_limited", { limit_per_minute: limitPerMinute });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }

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
    await env.DB.prepare(
      `DELETE FROM ingest_nonces WHERE device_id = ?1 AND ts_ms = ?2 AND expires_at < ?3`,
    )
      .bind(body.device_id, tsMs, dedupCleanupCutoff)
      .run();

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT (device_id, ts) DO NOTHING`,
      ).bind(
        body.device_id,
        tsMs,
        JSON.stringify(body.metrics),
        deltaT,
        thermalKW,
        cop,
        cop_quality,
        status_json,
        faults_json,
      ),
      env.DB.prepare(
        `INSERT INTO latest_state
           (device_id, ts, supplyC, returnC, tankC, ambientC, flowLps, compCurrentA, eevSteps, powerKW,
            deltaT, thermalKW, cop, cop_quality, mode, defrost, online, faults_json, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,1,?17,?18)
         ON CONFLICT(device_id) DO UPDATE SET
            ts=excluded.ts, supplyC=excluded.supplyC, returnC=excluded.returnC, tankC=excluded.tankC,
            ambientC=excluded.ambientC, flowLps=excluded.flowLps, compCurrentA=excluded.compCurrentA,
            eevSteps=excluded.eevSteps, powerKW=excluded.powerKW, deltaT=excluded.deltaT,
            thermalKW=excluded.thermalKW, cop=excluded.cop, cop_quality=excluded.cop_quality,
            mode=excluded.mode, defrost=excluded.defrost, online=1, faults_json=excluded.faults_json,
            updated_at=excluded.updated_at`,
      ).bind(
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
        faults_json,
        nowISO(),
      ),
      env.DB.prepare(
        `UPDATE devices SET online=1, last_seen_at=?2 WHERE device_id=?1`,
      ).bind(body.device_id, new Date(tsMs).toISOString()),
      env.DB.prepare(
        `INSERT INTO ingest_nonces (device_id, ts_ms, expires_at) VALUES (?1, ?2, ?3)`,
      ).bind(body.device_id, tsMs, dedupExpiresAt),
    ]);

    await recordOpsMetric(env, INGEST_ROUTE, 200, Date.now() - t0, body.device_id, deviceLog);
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
      await recordOpsMetric(env, INGEST_ROUTE, 409, Date.now() - t0, body.device_id, deviceLog);
      deviceLog.warn("ingest.duplicate_payload", {
        payload_ts: new Date(tsMs).toISOString(),
        dedup_window_ms: dedupWindowMs,
      });
      return withCors(
        req,
        env,
        json({ error: "Duplicate payload" }, { status: 409 }),
        cors,
      );
    }

    deviceLog.error("ingest.db_error", { error: e });
    await recordOpsMetric(env, INGEST_ROUTE, 500, Date.now() - t0, body.device_id, deviceLog);
    return withCors(
      req,
      env,
      json({ error: "DB error", detail: String(e?.message || e) }, { status: 500 }),
      cors,
    );
  }
}

export async function handleHeartbeat(req: Request, env: Env, profileId: string) {
  const t0 = Date.now();
  const log = loggerForRequest(req, { route: `${HEARTBEAT_ROUTE}/:profile`, profile_id: profileId });
  const cors = evaluateCors(req, env);
  if (!cors.allowed) {
    return json({ error: "Origin not allowed" }, { status: 403 });
  }

  let rawBodyText: string;
  try {
    rawBodyText = await req.text();
  } catch {
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }

  if (!payloadSizeOk(rawBodyText)) {
    return withCors(req, env, json({ error: "Payload too large" }, { status: 413 }), cors);
  }

  let rawBody: unknown;
  try {
    rawBody = readRawBody(rawBodyText);
  } catch {
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }

  const parsedBody = HeartbeatPayloadSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return withCors(req, env, validationErrorResponse(parsedBody.error), cors);
  }
  const body: HeartbeatPayload = parsedBody.data;

  const tsStr = body.ts ?? new Date().toISOString();
  const tsCheck = parseAndCheckTs(tsStr);
  if (!tsCheck.ok) {
    return withCors(req, env, json({ error: tsCheck.reason }, { status: 400 }), cors);
  }

  const keyHeader = req.headers.get(DEVICE_KEY_HEADER);
  const keyVerification = await verifyDeviceKey(env, body.device_id, keyHeader);
  if (!keyVerification.ok || !keyVerification.deviceKeyHash) {
    return withCors(req, env, json({ error: "Unauthorized" }, { status: 401 }), cors);
  }

  const signatureCheck = await ensureSignature(req, env, rawBodyText, keyVerification.deviceKeyHash);
  if (!signatureCheck.ok) {
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
    return withCors(
      req,
      env,
      json({ error: "Unauthorized (unknown device)" }, { status: 401 }),
      cors,
    );
  }

  if (devRow.profile_id && devRow.profile_id !== profileId) {
    log
      .with({
        device_id: body.device_id,
        db_profile_id: devRow.profile_id,
        requested_profile_id: profileId,
      })
      .warn("heartbeat.profile_mismatch");
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
      return withCors(
        req,
        env,
        json({ error: "Profile mismatch for device" }, { status: 409 }),
        cors,
      );
    }
  }

  const limitPerMinute = parsedRateLimit(env);
  if (await isRateLimited(env, HEARTBEAT_ROUTE, body.device_id, limitPerMinute)) {
    const deviceLog = log.with({ device_id: body.device_id });
    await recordOpsMetric(
      env,
      HEARTBEAT_ROUTE,
      429,
      Date.now() - t0,
      body.device_id,
      deviceLog,
    );
    deviceLog.warn("heartbeat.rate_limited", { limit_per_minute: limitPerMinute });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }

  const tsMs = tsCheck.ms ?? Date.now();

  try {
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE latest_state
            SET online=1, updated_at=?2, faults_json='[]'
          WHERE device_id=?1`,
      ).bind(body.device_id, new Date(tsMs).toISOString()),
      env.DB.prepare(
        `UPDATE devices SET online=1, last_seen_at=?2 WHERE device_id=?1`,
      ).bind(body.device_id, new Date(tsMs).toISOString()),
    ]);

    const deviceLog = log.with({ device_id: body.device_id });
    await recordOpsMetric(env, HEARTBEAT_ROUTE, 200, Date.now() - t0, body.device_id, deviceLog);
    deviceLog.info("heartbeat.accepted", { payload_ts: new Date(tsMs).toISOString() });
    return withCors(req, env, json({ ok: true, server_time: new Date().toISOString() }), cors);
  } catch (e) {
    const deviceLog = log.with({ device_id: body.device_id });
    deviceLog.error("heartbeat.db_error", { error: e });
    await recordOpsMetric(env, HEARTBEAT_ROUTE, 500, Date.now() - t0, body.device_id, deviceLog);
    return withCors(req, env, json({ error: "DB error" }, { status: 500 }), cors);
  }
}
