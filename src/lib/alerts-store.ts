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
  assigned_to: string | null;
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
  assigned_to?: string | null;
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
  assigned_to: string | null;
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
    assigned_to: row.assigned_to,
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
  const assignedTo = params.assigned_to ?? null;
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
            resolved_by, assigned_to, created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
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
        assignedTo,
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

interface AlertCommentRow {
  comment_id: string;
  alert_id: string;
  action: string;
  author_id: string | null;
  author_email: string | null;
  body: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface AlertCommentRecord {
  comment_id: string;
  alert_id: string;
  action: string;
  author_id: string | null;
  author_email: string | null;
  body: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function mapAlertCommentRow(row: AlertCommentRow): AlertCommentRecord {
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
    comment_id: row.comment_id,
    alert_id: row.alert_id,
    action: row.action,
    author_id: row.author_id,
    author_email: row.author_email,
    body: row.body,
    metadata,
    created_at: row.created_at,
  };
}

export async function getAlert(env: Env, alertId: string): Promise<AlertRecord | null> {
  const row = await env.DB
    .prepare(`SELECT * FROM alerts WHERE alert_id = ?1 LIMIT 1`)
    .bind(alertId)
    .first<AlertRow>();
  if (!row) return null;
  return mapAlertRow(row);
}

export interface AlertLifecycleUpdateBase {
  alert_id: string;
  actor_id: string;
  actor_email?: string | null;
  comment?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
}

export type AlertLifecycleUpdateParams =
  | (AlertLifecycleUpdateBase & {
      action: "acknowledge";
      assignee?: string | null;
    })
  | (AlertLifecycleUpdateBase & {
      action: "assign";
      assignee: string;
    })
  | (AlertLifecycleUpdateBase & {
      action: "resolve";
    });

export type AlertLifecycleUpdateResult =
  | { ok: true; alert: AlertRecord; comment: AlertCommentRecord | null }
  | { ok: false; reason: "not_found" };

export async function updateAlertLifecycle(
  env: Env,
  params: AlertLifecycleUpdateParams,
): Promise<AlertLifecycleUpdateResult> {
  const current = await env.DB
    .prepare(`SELECT * FROM alerts WHERE alert_id = ?1 LIMIT 1`)
    .bind(params.alert_id)
    .first<AlertRow>();
  if (!current) {
    return { ok: false, reason: "not_found" };
  }

  const now = nowISO();
  const actorEmail = params.actor_email ?? null;
  let commentMetadata: Record<string, unknown> | null = null;
  let commentAction = params.action;
  let commentBody: string | null = params.comment ?? null;
  let shouldInsertComment = Boolean(params.comment);
  let assignedTo = current.assigned_to;
  let acknowledgedAt = current.acknowledged_at;
  let status = current.status;
  let resolvedAt = current.resolved_at;
  let resolvedBy = current.resolved_by;

  if (params.action === "acknowledge") {
    acknowledgedAt = params.acknowledged_at ?? now;
    if (current.status !== "resolved") {
      status = "acknowledged";
    }
    if (params.assignee !== undefined) {
      assignedTo = params.assignee;
      if (!params.comment) {
        commentBody = null;
      }
      if (params.assignee !== null) {
        commentMetadata = { assignee: params.assignee };
      }
      shouldInsertComment = shouldInsertComment || params.assignee !== undefined;
    }
  } else if (params.action === "assign") {
    assignedTo = params.assignee;
    commentMetadata = { assignee: params.assignee };
    shouldInsertComment = true;
    commentAction = "assign";
  } else if (params.action === "resolve") {
    status = "resolved";
    resolvedAt = params.resolved_at ?? now;
    resolvedBy = params.actor_id;
    if (!acknowledgedAt) {
      acknowledgedAt = resolvedAt;
    }
  }

  const updateStmt = env.DB
    .prepare(
      `UPDATE alerts
          SET status = ?2,
              acknowledged_at = ?3,
              resolved_at = ?4,
              resolved_by = ?5,
              assigned_to = ?6,
              updated_at = ?7
        WHERE alert_id = ?1`,
    )
    .bind(
      params.alert_id,
      status,
      acknowledgedAt,
      resolvedAt,
      resolvedBy,
      assignedTo,
      now,
    );

  const statements = [updateStmt];
  let commentRecord: AlertCommentRecord | null = null;

  if (shouldInsertComment) {
    const commentId = crypto.randomUUID();
    const metadataJson = commentMetadata ? JSON.stringify(commentMetadata) : null;
    const insertStmt = env.DB
      .prepare(
        `INSERT INTO alert_comments (
            comment_id, alert_id, action, author_id, author_email, body, metadata_json, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(
        commentId,
        params.alert_id,
        commentAction,
        params.actor_id,
        actorEmail,
        commentBody,
        metadataJson,
        now,
      );
    statements.push(insertStmt);

    commentRecord = {
      comment_id: commentId,
      alert_id: params.alert_id,
      action: commentAction,
      author_id: params.actor_id,
      author_email: actorEmail,
      body: commentBody,
      metadata: commentMetadata,
      created_at: now,
    };
  }

  await env.DB.batch(statements);

  const refreshed = await getAlert(env, params.alert_id);
  if (!refreshed) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: true, alert: refreshed, comment: commentRecord };
}

export async function listAlertComments(env: Env, alertId: string): Promise<AlertCommentRecord[]> {
  const rows = await env.DB
    .prepare(
      `SELECT * FROM alert_comments WHERE alert_id = ?1 ORDER BY created_at ASC, comment_id ASC`,
    )
    .bind(alertId)
    .all<AlertCommentRow>();
  return (rows.results ?? []).map(mapAlertCommentRow);
}

export async function listAlertCommentsForAlerts(
  env: Env,
  alertIds: string[],
): Promise<Map<string, AlertCommentRecord[]>> {
  const map = new Map<string, AlertCommentRecord[]>();
  if (!alertIds.length) {
    return map;
  }
  const unique = [...new Set(alertIds)];
  const placeholders = unique.map((_, idx) => `?${idx + 1}`).join(",");
  const rows = await env.DB
    .prepare(
      `SELECT * FROM alert_comments
         WHERE alert_id IN (${placeholders})
         ORDER BY alert_id ASC, created_at ASC, comment_id ASC`,
    )
    .bind(...unique)
    .all<AlertCommentRow>();

  for (const row of rows.results ?? []) {
    const record = mapAlertCommentRow(row);
    const bucket = map.get(record.alert_id);
    if (bucket) {
      bucket.push(record);
    } else {
      map.set(record.alert_id, [record]);
    }
  }

  for (const id of unique) {
    if (!map.has(id)) {
      map.set(id, []);
    }
  }

  return map;
}

export async function addAlertComment(
  env: Env,
  params: {
    alert_id: string;
    action: string;
    body: string | null;
    actor_id: string;
    actor_email?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<AlertCommentRecord> {
  const now = nowISO();
  const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;
  const commentId = crypto.randomUUID();
  const insertStmt = env.DB
    .prepare(
      `INSERT INTO alert_comments (
          comment_id, alert_id, action, author_id, author_email, body, metadata_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      commentId,
      params.alert_id,
      params.action,
      params.actor_id,
      params.actor_email ?? null,
      params.body ?? null,
      metadataJson,
      now,
    );

  const updateAlertStmt = env.DB
    .prepare(`UPDATE alerts SET updated_at = ?2 WHERE alert_id = ?1`)
    .bind(params.alert_id, now);

  await env.DB.batch([insertStmt, updateAlertStmt]);

  return {
    comment_id: commentId,
    alert_id: params.alert_id,
    action: params.action,
    author_id: params.actor_id,
    author_email: params.actor_email ?? null,
    body: params.body ?? null,
    metadata: params.metadata ?? null,
    created_at: now,
  };
}
