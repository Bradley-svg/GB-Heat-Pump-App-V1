import type { Env } from "../env";
import { claimDeviceIfUnowned, verifyDeviceKey } from "../lib/device";
import { json } from "../utils/responses";
import { withCors } from "../lib/cors";
import { parseAndCheckTs, nowISO } from "../utils";
import { validationErrorResponse } from "../utils/validation";
import { HeartbeatPayloadSchema, TelemetryPayloadSchema } from "../schemas/ingest";
import type { HeartbeatPayload, TelemetryPayload } from "../schemas/ingest";
import { deriveTelemetryMetrics } from "../telemetry";

export async function handleIngest(req: Request, env: Env, profileId: string) {
  const t0 = Date.now();

  let rawBody: unknown;
  try {
    rawBody = await req.json();
    if (JSON.stringify(rawBody).length > 256_000) {
      return withCors(json({ error: "Payload too large" }, { status: 413 }));
    }
  } catch {
    return withCors(json({ error: "Invalid JSON" }, { status: 400 }));
  }

  const parsedBody = TelemetryPayloadSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return withCors(validationErrorResponse(parsedBody.error));
  }
  const body: TelemetryPayload = parsedBody.data;

  const tsCheck = parseAndCheckTs(body.ts);
  if (!tsCheck.ok) return withCors(json({ error: tsCheck.reason }, { status: 400 }));
  const tsMs = tsCheck.ms!;

  const keyHeader = req.headers.get("X-GREENBRO-DEVICE-KEY");
  if (!(await verifyDeviceKey(env, body.device_id, keyHeader))) {
    return withCors(json({ error: "Unauthorized" }, { status: 401 }));
  }

  const devRow = await env.DB
    .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1`)
    .bind(body.device_id)
    .first<{ profile_id?: string | null }>();

  if (!devRow) {
    return withCors(json({ error: "Unauthorized (unknown device)" }, { status: 401 }));
  }

  if (devRow.profile_id && devRow.profile_id !== profileId) {
    console.warn("Profile mismatch", {
      deviceId: body.device_id,
      urlProfileId: profileId,
      dbProfile: devRow.profile_id,
    });
    return withCors(json({ error: "Profile mismatch for device" }, { status: 409 }));
  }

  if (!devRow.profile_id) {
    const claim = await claimDeviceIfUnowned(env, body.device_id, profileId);
    if (!claim.ok && claim.reason === "claimed_by_other") {
      return withCors(json({ error: "Profile mismatch for device" }, { status: 409 }));
    }
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

  try {
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
    ]);

    try {
      const dur = Date.now() - t0;
      await env.DB
        .prepare(
          `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES (?1, ?2, ?3, ?4, ?5)`,
        )
        .bind(nowISO(), "/api/ingest", 200, dur, body.device_id)
        .run();
    } catch (e) {
      console.error("ops_metrics insert failed (ingest)", e);
    }

    return withCors(json({ ok: true }));
  } catch (e: any) {
    try {
      const dur = Date.now() - t0;
      await env.DB
        .prepare(
          `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES (?1, ?2, ?3, ?4, ?5)`,
        )
        .bind(nowISO(), "/api/ingest", 500, dur, body.device_id)
        .run();
    } catch (logErr) {
      console.error("ops_metrics insert failed (ingest error)", logErr);
    }
    return withCors(json({ error: "DB error", detail: String(e?.message || e) }, { status: 500 }));
  }
}

export async function handleHeartbeat(req: Request, env: Env, profileId: string) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return withCors(json({ error: "Invalid JSON" }, { status: 400 }));
  }

  const parsedBody = HeartbeatPayloadSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return withCors(validationErrorResponse(parsedBody.error));
  }
  const body: HeartbeatPayload = parsedBody.data;

  const tsStr = body.ts ?? new Date().toISOString();
  const tsCheck = parseAndCheckTs(tsStr);
  if (!tsCheck.ok) return withCors(json({ error: tsCheck.reason }, { status: 400 }));

  const keyHeader = req.headers.get("X-GREENBRO-DEVICE-KEY");
  if (!(await verifyDeviceKey(env, body.device_id, keyHeader))) {
    return withCors(json({ error: "Unauthorized" }, { status: 401 }));
  }

  const devRow = await env.DB
    .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1`)
    .bind(body.device_id)
    .first<{ profile_id?: string | null }>();

  if (!devRow) return withCors(json({ error: "Unauthorized (unknown device)" }, { status: 401 }));

  if (devRow.profile_id && devRow.profile_id !== profileId) {
    console.warn("Profile mismatch", {
      deviceId: body.device_id,
      urlProfileId: profileId,
      dbProfile: devRow.profile_id,
    });
    return withCors(json({ error: "Profile mismatch for device" }, { status: 409 }));
  }

  if (!devRow.profile_id) {
    const claim = await claimDeviceIfUnowned(env, body.device_id, profileId);
    if (!claim.ok && claim.reason === "claimed_by_other") {
      return withCors(json({ error: "Profile mismatch for device" }, { status: 409 }));
    }
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

    return withCors(json({ ok: true, server_time: new Date().toISOString() }));
  } catch (e) {
    console.error("Heartbeat update failed", e);
    return withCors(json({ error: "DB error" }, { status: 500 }));
  }
}
