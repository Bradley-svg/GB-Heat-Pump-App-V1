import type { Env } from "../env";
import { andWhere, nowISO } from "../utils";

export interface AuditRecord {
  audit_id: string;
  actor_id: string;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface CreateAuditParams {
  audit_id?: string;
  actor_id: string;
  actor_email?: string | null;
  actor_name?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at?: string;
}

export type CreateAuditResult =
  | { ok: true; audit: AuditRecord }
  | { ok: false; reason: "conflict" };

export interface AuditListFilters {
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  action?: string;
  since?: string;
  until?: string;
  limit: number;
}

interface AuditRow {
  audit_id: string;
  actor_id: string;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata_json: string | null;
  ip_address: string | null;
  created_at: string;
}

function mapAuditRow(row: AuditRow): AuditRecord {
  let metadata: Record<string, unknown> | null = null;
  if (row.metadata_json) {
    try {
      const parsed = JSON.parse(row.metadata_json);
      if (parsed && typeof parsed === "object") {
        metadata = parsed as Record<string, unknown>;
      }
    } catch {
      metadata = null;
    }
  }

  return {
    audit_id: row.audit_id,
    actor_id: row.actor_id,
    actor_email: row.actor_email,
    actor_name: row.actor_name,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    metadata,
    ip_address: row.ip_address,
    created_at: row.created_at,
  };
}

export async function createAuditEntry(
  env: Env,
  params: CreateAuditParams,
): Promise<CreateAuditResult> {
  const id = params.audit_id ?? crypto.randomUUID();
  const createdAt = params.created_at ?? nowISO();
  const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;
  const actorEmail = params.actor_email ?? null;
  const actorName = params.actor_name ?? null;
  const entityType = params.entity_type ?? null;
  const entityId = params.entity_id ?? null;
  const ipAddress = params.ip_address ?? null;

  try {
    await env.DB
      .prepare(
        `INSERT INTO audit_trail (
            audit_id, actor_id, actor_email, actor_name, action,
            entity_type, entity_id, metadata_json, ip_address, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      )
      .bind(
        id,
        params.actor_id,
        actorEmail,
        actorName,
        params.action,
        entityType,
        entityId,
        metadataJson,
        ipAddress,
        createdAt,
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
    .prepare(`SELECT * FROM audit_trail WHERE audit_id = ?1 LIMIT 1`)
    .bind(id)
    .first<AuditRow>();

  if (!row) {
    return { ok: false, reason: "conflict" };
  }

  return { ok: true, audit: mapAuditRow(row) };
}

export async function listAuditTrail(
  env: Env,
  filters: AuditListFilters,
): Promise<AuditRecord[]> {
  let where = "";
  const bind: any[] = [];

  if (filters.entity_type) {
    where = andWhere(where, "entity_type = ?");
    bind.push(filters.entity_type);
  }

  if (filters.entity_id) {
    where = andWhere(where, "entity_id = ?");
    bind.push(filters.entity_id);
  }

  if (filters.actor_id) {
    where = andWhere(where, "actor_id = ?");
    bind.push(filters.actor_id);
  }

  if (filters.action) {
    where = andWhere(where, "action = ?");
    bind.push(filters.action);
  }

  if (filters.since) {
    where = andWhere(where, "created_at >= ?");
    bind.push(filters.since);
  }

  if (filters.until) {
    where = andWhere(where, "created_at <= ?");
    bind.push(filters.until);
  }

  const sql = `SELECT * FROM audit_trail ${where} ORDER BY created_at DESC LIMIT ?`;
  bind.push(filters.limit);

  const rows = await env.DB.prepare(sql).bind(...bind).all<AuditRow>();
  return (rows.results ?? []).map(mapAuditRow);
}
