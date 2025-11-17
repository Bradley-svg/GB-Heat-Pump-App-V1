import type { Env } from "../env";
import { json } from "../utils/responses";
import { evaluateCors, withCors } from "../lib/cors";
import { loggerForRequest } from "../utils/logging";
import { recordOpsMetric } from "../lib/ops-metrics";
import { markRequestMetricsRecorded, requestMetricsRecorded } from "../lib/request-metrics";
import { deriveTelemetryMetrics } from "../telemetry";
import { ExportBatchSchema, type ExportBatch, type ExportRecord } from "../schemas/export";
import { verifyBatchSignature } from "../utils/ed25519";
import { nowISO } from "../utils";

const SIGNATURE_HEADER = "x-batch-signature";
const MAX_PAYLOAD_BYTES = 256_000;
const INGEST_ROUTE = "/api/ingest";
const HEARTBEAT_ROUTE = "/api/heartbeat";
const STATEMENT_BATCH_SIZE = 25;

const textEncoder = new TextEncoder();

function payloadSizeOk(raw: string): boolean {
  return textEncoder.encode(raw).length <= MAX_PAYLOAD_BYTES;
}

function statusJson(metrics: ExportRecord["metrics"]) {
  return JSON.stringify({
    control_mode: metrics.control_mode ?? null,
    status_code: metrics.status_code ?? null
  });
}

function faultsJson(metrics: ExportRecord["metrics"]) {
  return JSON.stringify(
    metrics.fault_code && metrics.fault_code.length > 0 ? [metrics.fault_code] : []
  );
}

type BoundStatement = ReturnType<ReturnType<Env["DB"]["prepare"]>["bind"]>;

function buildRecordStatements(env: Env, profileId: string, record: ExportRecord): BoundStatement[] {
  const tsMs = Date.parse(record.timestamp);
  if (!Number.isFinite(tsMs)) {
    throw new Error("invalid_record_timestamp");
  }

  const supply = typeof record.metrics.supplyC === "number" ? record.metrics.supplyC : null;
  const ret = typeof record.metrics.returnC === "number" ? record.metrics.returnC : null;
  const flow = typeof record.metrics.flowLps === "number" ? record.metrics.flowLps : null;
  const powerKW = typeof record.metrics.powerKW === "number" ? record.metrics.powerKW : null;

  const derived = deriveTelemetryMetrics({
    supplyC: supply ?? undefined,
    returnC: ret ?? undefined,
    flowLps: flow ?? undefined,
    powerKW: powerKW ?? undefined
  });

  const metricsJson = JSON.stringify(record.metrics);
  const faults = faultsJson(record.metrics);
  const status = statusJson(record.metrics);
  const updatedAtIso = nowISO();
  const lastSeenIso = new Date(tsMs).toISOString();

  const telemetryInsert = env.DB
    .prepare(
      `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
       ON CONFLICT (device_id, ts) DO NOTHING`
    )
    .bind(
      record.didPseudo,
      tsMs,
      metricsJson,
      derived.deltaT,
      derived.thermalKW,
      derived.cop,
      derived.cop_quality,
      status,
      faults
    );

  const latestStateUpsert = env.DB
    .prepare(
      `INSERT INTO latest_state
         (device_id, ts, supplyC, returnC, flowLps, powerKW, deltaT, thermalKW, cop, cop_quality, mode,
          online, payload_json, faults_json, updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,1,?12,?13,?14)
       ON CONFLICT(device_id) DO UPDATE SET
         ts=excluded.ts,
         supplyC=excluded.supplyC,
         returnC=excluded.returnC,
         flowLps=excluded.flowLps,
         powerKW=excluded.powerKW,
         deltaT=excluded.deltaT,
         thermalKW=excluded.thermalKW,
         cop=excluded.cop,
         cop_quality=excluded.cop_quality,
         mode=excluded.mode,
         online=1,
         payload_json=excluded.payload_json,
         faults_json=excluded.faults_json,
         updated_at=excluded.updated_at`
    )
    .bind(
      record.didPseudo,
      tsMs,
      supply,
      ret,
      flow,
      powerKW,
      derived.deltaT,
      derived.thermalKW,
      derived.cop,
      derived.cop_quality,
      record.metrics.control_mode ?? null,
      metricsJson,
      faults,
      updatedAtIso
    );

  const devicesUpsert = env.DB
    .prepare(
      `INSERT INTO devices (device_id, profile_id, online, last_seen_at)
       VALUES (?1, ?2, 1, ?3)
       ON CONFLICT(device_id) DO UPDATE SET
         profile_id = COALESCE(devices.profile_id, excluded.profile_id),
         online = 1,
         last_seen_at = excluded.last_seen_at`
    )
    .bind(record.didPseudo, profileId, lastSeenIso);

  return [telemetryInsert, latestStateUpsert, devicesUpsert];
}

async function persistBatch(
  env: Env,
  profileId: string,
  batchRowId: string,
  parsed: ExportBatch,
) {
  const statementBuffer: BoundStatement[] = [];
  const db = env.DB;

  if (typeof db.exec !== "function") {
    throw new Error("D1 database binding is missing exec support");
  }

  const flush = async () => {
    if (!statementBuffer.length) {
      return;
    }
    const chunk = statementBuffer.splice(0, statementBuffer.length);
    await db.batch(chunk);
  };

  const enqueue = async (statement: BoundStatement) => {
    statementBuffer.push(statement);
    if (statementBuffer.length >= STATEMENT_BATCH_SIZE) {
      await flush();
    }
  };

  await db.exec("BEGIN TRANSACTION");
  try {
    await enqueue(
      db
        .prepare(
          `INSERT INTO ingest_batches (id, batch_id, profile_id, record_count, payload_json, received_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
        )
        .bind(
          batchRowId,
          parsed.batchId,
          profileId,
          parsed.records.length,
          JSON.stringify({ profileId, batchId: parsed.batchId, count: parsed.records.length }),
          nowISO(),
        ),
    );

    for (const record of parsed.records) {
      const statements = buildRecordStatements(env, profileId, record);
      for (const statement of statements) {
        await enqueue(statement);
      }
    }

    await flush();
    await db.exec("COMMIT");
  } catch (error) {
    try {
      await db.exec("ROLLBACK");
    } catch {
      // ignore rollback failures
    }
    throw error;
  }
}

export async function handleIngest(request: Request, env: Env, profileId: string): Promise<Response> {
  const cors = evaluateCors(request, env);
  const log = loggerForRequest(request, { route: INGEST_ROUTE, profile_id: profileId });

  if (request.method !== "POST") {
    return withCors(
      request,
      env,
      json({ error: "method_not_allowed" }, { status: 405 }),
      cors
    );
  }

  const signature = request.headers.get(SIGNATURE_HEADER);
  if (!signature) {
    return withCors(
      request,
      env,
      json({ error: "raw_ingest_disabled" }, { status: 410 }),
      cors
    );
  }

  if (!env.EXPORT_VERIFY_PUBKEY) {
    return withCors(
      request,
      env,
      json({ error: "signature_verifier_unconfigured" }, { status: 503 }),
      cors
    );
  }

  const rawBody = await request.text();
  if (!payloadSizeOk(rawBody)) {
    return withCors(
      request,
      env,
      json({ error: "payload_too_large" }, { status: 413 }),
      cors
    );
  }

  const payloadBytes = textEncoder.encode(rawBody).buffer;
  const signatureValid = await verifyBatchSignature(env, payloadBytes, signature);
  if (!signatureValid) {
    return withCors(
      request,
      env,
      json({ error: "invalid_batch_signature" }, { status: 401 }),
      cors
    );
  }

  let parsed;
  try {
    parsed = ExportBatchSchema.parse(JSON.parse(rawBody));
  } catch (error) {
    log.warn("ingest.invalid_payload", { error });
    return withCors(
      request,
      env,
      json({ error: "invalid_payload" }, { status: 400 }),
      cors
    );
  }

  const startedAt = Date.now();
  let statusCode = 202;

  try {
    const batchRowId = crypto.randomUUID();
    await persistBatch(env, profileId, batchRowId, parsed);

    markRequestMetricsRecorded(request);
    log.info("ingest.batch_accepted", { batch_id: parsed.batchId, records: parsed.records.length });
    return withCors(
      request,
      env,
      json({ ok: true, batchId: parsed.batchId, accepted: parsed.records.length }, { status: 202 }),
      cors
    );
  } catch (error) {
    statusCode = 500;
    log.error("ingest.batch_failed", { error });
    return withCors(request, env, json({ error: "ingest_failed" }, { status: 500 }), cors);
  } finally {
    if (!requestMetricsRecorded(request)) {
      await recordOpsMetric(env, INGEST_ROUTE, statusCode, Date.now() - startedAt, null, log);
    }
  }
}

export async function handleHeartbeat(request: Request, env: Env): Promise<Response> {
  const cors = evaluateCors(request, env);
  return withCors(
    request,
    env,
    json({ error: "heartbeat_disabled" }, { status: 410 }),
    cors
  );
}
