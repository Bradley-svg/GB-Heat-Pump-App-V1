import type { Env } from "../env";
import { andWhere, nowISO } from "../utils";

export interface AlertRecord {
  alert_id: string;
  device_id: string;
  profile_id: string | null;
  alert_type: string;
  severity: string;
  status: string;
  summary: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertParams {
  alert_id?: string;
  device_id: string;
  profile_id?: string | null;
  alert_type: string;
  severity: string;
  status: string;
  summary?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CreateAlertResult =
  | { ok: true; alert: AlertRecord }
  | { ok: false; reason: "device_not_found" | "conflict" };

export interface AlertListFilters {
  status?: string;
  severity?: string;
  device_id?: string;
  profile_id?: string;
  profile_ids?: string[];
  since?: string;
  until?: string;
  limit: number;
}

interface AlertRow {
  alert_id: string;
  device_id: string;
  profile_id: string | null;
  alert_type: string;
  severity: string;
  status: string;
  summary: string | null;
  description: string | null;
  metadata_json: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapAlertRow(row: AlertRow): AlertRecord {
  let metadata: Record<string, unknown> | null = null;
  if (row.metadata_json) {
    try {
      const parsed = JSON.parse(row.metadata_json);
      if (parsed && typeof parsed === "object") metadata = parsed as Record<string, unknown>;
    } catch {
      metadata = null;
    }
  }
  return {
    alert_id: row.alert_id,
    device_id: row.device_id,
    profile_id: row.profile_id,
    alert_type: row.alert_type,
    severity: row.severity,
    status: row.status,
    summary: row.summary,
    description: row.description,
    metadata,
    acknowledged_at: row.acknowledged_at,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createAlert(env: Env, params: CreateAlertParams): Promise<CreateAlertResult> {
  const deviceId = params.device_id;
  const id = params.alert_id ?? crypto.randomUUID();
  const createdAt = params.created_at ?? nowISO();
  const updatedAt = params.updated_at ?? createdAt;
  const acknowledgedAt = params.acknowledged_at ?? null;
  const resolvedAt = params.resolved_at ?? null;
  const resolvedBy = params.resolved_by ?? null;
  const summary = params.summary ?? null;
  const description = params.description ?? null;
  const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;

  let profileId: string | null | undefined = params.profile_id ?? null;

  if (!profileId) {
    const deviceRow = await env.DB
      .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1 LIMIT 1`)
      .bind(deviceId)
      .first<{ profile_id: string | null }>();
    if (!deviceRow) {
      return { ok: false, reason: "device_not_found" };
    }
    profileId = deviceRow.profile_id ?? null;
  } else {
    const exists = await env.DB
      .prepare(`SELECT 1 FROM devices WHERE device_id = ?1 LIMIT 1`)
      .bind(deviceId)
      .first();
    if (!exists) {
      return { ok: false, reason: "device_not_found" };
    }
  }

  try {
    await env.DB
      .prepare(
        `INSERT INTO alerts (
            alert_id, device_id, profile_id, alert_type, severity, status,
            summary, description, metadata_json, acknowledged_at, resolved_at,
            resolved_by, created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
      )
      .bind(
        id,
        deviceId,
        profileId,
        params.alert_type,
        params.severity,
        params.status,
        summary,
        description,
        metadataJson,
        acknowledgedAt,
        resolvedAt,
        resolvedBy,
        createdAt,
        updatedAt,
      )
      .run();
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : String(err);
    if (message.includes("UNIQUE constraint failed")) {
      return { ok: false, reason: "conflict" };
    }
    throw err;
  }

  const row = await env.DB
    .prepare(`SELECT * FROM alerts WHERE alert_id = ?1 LIMIT 1`)
    .bind(id)
    .first<AlertRow>();

  if (!row) {
    return { ok: false, reason: "device_not_found" };
  }

  return { ok: true, alert: mapAlertRow(row) };
}

export async function listAlerts(env: Env, filters: AlertListFilters): Promise<AlertRecord[]> {
  let where = "";
  const bind: any[] = [];

  if (filters.status) {
    where = andWhere(where, "status = ?");
    bind.push(filters.status);
  }

  if (filters.severity) {
    where = andWhere(where, "severity = ?");
    bind.push(filters.severity);
  }

  if (filters.device_id) {
    where = andWhere(where, "device_id = ?");
    bind.push(filters.device_id);
  }

  if (filters.profile_ids && filters.profile_ids.length) {
    const placeholders = filters.profile_ids.map(() => "?").join(",");
    where = andWhere(where, `profile_id IN (${placeholders})`);
    bind.push(...filters.profile_ids);
  } else if (filters.profile_id) {
    where = andWhere(where, "profile_id = ?");
    bind.push(filters.profile_id);
  }

  if (filters.since) {
    where = andWhere(where, "created_at >= ?");
    bind.push(filters.since);
  }

  if (filters.until) {
    where = andWhere(where, "created_at <= ?");
    bind.push(filters.until);
  }

  const sql = `SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT ?`;
  bind.push(filters.limit);

  const rows = await env.DB.prepare(sql).bind(...bind).all<AlertRow>();
  return (rows.results ?? []).map(mapAlertRow);
}
