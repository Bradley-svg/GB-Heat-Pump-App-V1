import type { Env } from "../env";
import { andWhere, nowISO } from "../utils";

export interface CommissioningRunRecord {
  run_id: string;
  device_id: string;
  profile_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  checklist: string[] | null;
  notes: string | null;
  performed_by: string | null;
  report_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCommissioningRunParams {
  run_id?: string;
  device_id: string;
  profile_id?: string | null;
  status: string;
  started_at?: string;
  completed_at?: string | null;
  checklist?: string[] | null;
  notes?: string | null;
  performed_by?: string | null;
  report_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CreateCommissioningRunResult =
  | { ok: true; run: CommissioningRunRecord }
  | { ok: false; reason: "device_not_found" | "conflict" };

export interface CommissioningRunFilters {
  status?: string;
  device_id?: string;
  profile_id?: string;
  profile_ids?: string[];
  since?: string;
  until?: string;
  limit: number;
}

interface CommissioningRow {
  run_id: string;
  device_id: string;
  profile_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  checklist_json: string | null;
  notes: string | null;
  performed_by: string | null;
  report_url: string | null;
  created_at: string;
  updated_at: string;
}

function mapRunRow(row: CommissioningRow): CommissioningRunRecord {
  let checklist: string[] | null = null;
  if (row.checklist_json) {
    try {
      const parsed = JSON.parse(row.checklist_json);
      if (Array.isArray(parsed)) checklist = parsed.filter((item) => typeof item === "string");
    } catch {
      checklist = null;
    }
  }
  return {
    run_id: row.run_id,
    device_id: row.device_id,
    profile_id: row.profile_id,
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    checklist,
    notes: row.notes,
    performed_by: row.performed_by,
    report_url: row.report_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createCommissioningRun(
  env: Env,
  params: CreateCommissioningRunParams,
): Promise<CreateCommissioningRunResult> {
  const deviceId = params.device_id;
  const id = params.run_id ?? crypto.randomUUID();
  const createdAt = params.created_at ?? nowISO();
  const updatedAt = params.updated_at ?? createdAt;
  const startedAt = params.started_at ?? createdAt;
  const completedAt = params.completed_at ?? null;
  const checklistJson = params.checklist ? JSON.stringify(params.checklist) : null;
  const notes = params.notes ?? null;
  const performedBy = params.performed_by ?? null;
  const reportUrl = params.report_url ?? null;

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
        `INSERT INTO commissioning_runs (
            run_id, device_id, profile_id, status, started_at,
            completed_at, checklist_json, notes, performed_by,
            report_url, created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
      )
      .bind(
        id,
        deviceId,
        profileId,
        params.status,
        startedAt,
        completedAt,
        checklistJson,
        notes,
        performedBy,
        reportUrl,
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
    .prepare(`SELECT * FROM commissioning_runs WHERE run_id = ?1 LIMIT 1`)
    .bind(id)
    .first<CommissioningRow>();

  if (!row) {
    return { ok: false, reason: "device_not_found" };
  }

  return { ok: true, run: mapRunRow(row) };
}

export async function listCommissioningRuns(
  env: Env,
  filters: CommissioningRunFilters,
): Promise<CommissioningRunRecord[]> {
  let where = "";
  const bind: any[] = [];

  if (filters.status) {
    where = andWhere(where, "status = ?");
    bind.push(filters.status);
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

  const sql = `SELECT * FROM commissioning_runs ${where} ORDER BY created_at DESC LIMIT ?`;
  bind.push(filters.limit);

  const rows = await env.DB.prepare(sql).bind(...bind).all<CommissioningRow>();
  return (rows.results ?? []).map(mapRunRow);
}
