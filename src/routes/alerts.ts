import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import {
  buildDeviceLookup,
  buildDeviceScope,
  fetchDeviceMeta,
  presentDeviceId,
  resolveDeviceId,
  type DeviceMeta,
} from "../lib/device";
import { json } from "../utils/responses";
import { andWhere, nowISO, parseFaultsJson } from "../utils";
import {
  AlertsQuerySchema,
  AlertListQuerySchema,
  CreateAlertSchema,
  AlertLifecycleActionSchema,
  AlertCommentCreateSchema,
  type AlertListQuery,
  type CreateAlertInput,
  type AlertLifecycleActionInput,
  type AlertCommentCreateInput,
} from "../schemas/alerts";
import { validationErrorResponse, validateWithSchema } from "../utils/validation";
import {
  createAlert,
  listAlerts,
  getAlert,
  updateAlertLifecycle,
  listAlertComments,
  listAlertCommentsForAlerts,
  addAlertComment,
  type AlertRecord,
  type AlertCommentRecord,
} from "../lib/alerts-store";
import { createAuditEntry } from "../lib/audit-store";
import {
  DASHBOARD_CACHE_AREA,
  bumpDashboardTokens,
  scopeIdsForProfiles,
} from "../lib/dashboard-cache";
import { loggerForRequest, type Logger } from "../utils/logging";

async function invalidateClientDashboardCache(
  env: Env,
  profileId: string | null,
  logger: Logger,
): Promise<void> {
  try {
    const scopeIds = scopeIdsForProfiles([profileId]);
    await bumpDashboardTokens(env, DASHBOARD_CACHE_AREA.clientCompact, scopeIds);
  } catch (error) {
    logger.warn("alerts.cache_invalidation_failed", { profile_id: profileId, error });
  }
}

export async function handleAlertsFeed(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user);
  const url = new URL(req.url);
  const paramsResult = AlertsQuerySchema.safeParse({
    limit: url.searchParams.get("limit"),
    hours: url.searchParams.get("hours"),
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { limit = 40, hours = 72 } = paramsResult.data;
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;

  if (scope.empty) {
    return json({ generated_at: nowISO(), items: [], stats: { total: 0, active: 0 } });
  }

  let where = "";
  const bind: any[] = [];
  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }

  const faultsWhere = andWhere(
    andWhere(where, "t.ts >= ?"),
    "t.faults_json IS NOT NULL AND t.faults_json != '[]' AND t.faults_json != ''",
  );
  const faultRows = await env.DB
    .prepare(
      `SELECT t.device_id, t.ts, t.faults_json, d.site, ls.updated_at AS last_update, ls.faults_json AS latest_faults
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         LEFT JOIN latest_state ls ON ls.device_id = t.device_id
         ${faultsWhere}
        ORDER BY t.ts DESC
        LIMIT ${limit}`,
    )
    .bind(...bind, sinceMs)
    .all<{
      device_id: string;
      ts: number;
      faults_json: string | null;
      site: string | null;
      last_update: string | null;
      latest_faults: string | null;
    }>();

  let items;
  try {
    items = await Promise.all(
      (faultRows.results ?? []).map(async (row) => {
        const faults = parseFaultsJson(row.faults_json);
        const activeFaults = parseFaultsJson(row.latest_faults);
        return {
          device_id: presentDeviceId(row.device_id, scope.isAdmin),
          lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
          site: row.site ?? null,
          ts: new Date(row.ts).toISOString(),
          fault_count: faults.length,
          faults,
          active: activeFaults.length > 0,
          active_faults: activeFaults,
          last_update: row.last_update ?? null,
        };
      }),
    );
  } catch (err) {
    loggerForRequest(req, { route: "/api/alerts/recent" }).error("alerts.feed_failed", {
      error: err,
    });
    return json({ error: "Server error" }, { status: 500 });
  }

  const active = items.filter((i: any) => i.active).length;

  return json({
    generated_at: nowISO(),
    items,
    stats: {
      total: items.length,
      active,
    },
  });
}

function requestIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    null
  );
}

function presentAlertComment(comment: AlertCommentRecord) {
  return {
    comment_id: comment.comment_id,
    alert_id: comment.alert_id,
    action: comment.action,
    author_id: comment.author_id,
    author_email: comment.author_email,
    body: comment.body,
    metadata: comment.metadata,
    created_at: comment.created_at,
  };
}

async function ensureAlertAccess(
  env: Env,
  scope: ReturnType<typeof buildDeviceScope>,
  alert: AlertRecord,
) {
  if (scope.isAdmin) return true;
  if (scope.empty) return false;
  const allowedProfiles = (scope.bind as string[]) ?? [];
  if (!allowedProfiles.length) return false;
  if (alert.profile_id && allowedProfiles.includes(alert.profile_id)) return true;

  const row = await env.DB
    .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1 LIMIT 1`)
    .bind(alert.device_id)
    .first<{ profile_id: string | null }>();
  const profileId = row?.profile_id ?? null;
  if (!profileId) return false;
  return allowedProfiles.includes(profileId);
}

async function recordAlertAudit(
  env: Env,
  req: Request,
  userEmail: string,
  action: string,
  alert: AlertRecord,
  extras?: Record<string, unknown>,
) {
  const result = await createAuditEntry(env, {
    actor_id: userEmail,
    actor_email: userEmail,
    actor_name: null,
    action,
    entity_type: "alert",
    entity_id: alert.alert_id,
    metadata: {
      alert_id: alert.alert_id,
      device_id: alert.device_id,
      profile_id: alert.profile_id,
      status: alert.status,
      severity: alert.severity,
      acknowledged_at: alert.acknowledged_at,
      resolved_at: alert.resolved_at,
      assigned_to: alert.assigned_to,
      ...extras,
    },
    ip_address: requestIp(req),
  });

  if (!result.ok) {
    throw new Error("Failed to create audit entry for alert lifecycle action");
  }
}

async function presentAlertRecord(
  record: AlertRecord,
  env: Env,
  scope: ReturnType<typeof buildDeviceScope>,
  meta: Map<string, DeviceMeta>,
  comments?: AlertCommentRecord[] | null,
) {
  const info = meta.get(record.device_id);
  const outwardId = presentDeviceId(record.device_id, scope.isAdmin);
  const lookup = await buildDeviceLookup(record.device_id, env, scope.isAdmin);
  return {
    alert_id: record.alert_id,
    device_id: outwardId,
    lookup,
    profile_id: record.profile_id ?? info?.profile_id ?? null,
    site: info?.site ?? null,
    alert_type: record.alert_type,
    severity: record.severity,
    status: record.status,
    summary: record.summary,
    description: record.description,
    metadata: record.metadata,
    acknowledged_at: record.acknowledged_at,
    resolved_at: record.resolved_at,
    resolved_by: record.resolved_by,
    assigned_to: record.assigned_to,
    created_at: record.created_at,
    updated_at: record.updated_at,
    comments: (comments ?? []).map(presentAlertComment),
  };
}

export async function handleListAlertRecords(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user, "a");
  if (scope.empty && !scope.isAdmin) {
    return json({ generated_at: nowISO(), items: [] });
  }

  const url = new URL(req.url);
  const paramsResult = validateWithSchema<AlertListQuery>(AlertListQuerySchema, {
    status: url.searchParams.get("status") ?? undefined,
    severity: url.searchParams.get("severity") ?? undefined,
    device: url.searchParams.get("device") ?? undefined,
    profile: url.searchParams.get("profile") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    since: url.searchParams.get("since") ?? undefined,
    until: url.searchParams.get("until") ?? undefined,
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.issues);
  }
  const params = paramsResult.data;

  if (params.since && params.until) {
    const sinceMs = Date.parse(params.since);
    const untilMs = Date.parse(params.until);
    if (!Number.isNaN(sinceMs) && !Number.isNaN(untilMs) && untilMs < sinceMs) {
      return json({ error: "Invalid range" }, { status: 400 });
    }
  }

  let deviceId: string | undefined;
  if (params.device) {
    const resolved = await resolveDeviceId(params.device, env, scope.isAdmin);
    if (!resolved) {
      return json({ error: "Unknown device" }, { status: 404 });
    }
    deviceId = resolved;
  }

  let profileIds: string[] | undefined;
  let singleProfile: string | undefined = undefined;
  if (scope.isAdmin) {
    if (params.profile) singleProfile = params.profile;
  } else {
    const allowedProfiles = scope.bind as string[];
    if (!allowedProfiles.length) {
      return json({ generated_at: nowISO(), items: [] });
    }
    if (params.profile) {
      if (!allowedProfiles.includes(params.profile)) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
      profileIds = [params.profile];
    } else {
      profileIds = allowedProfiles;
    }

    if (deviceId) {
      const deviceRow = await env.DB
        .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1 LIMIT 1`)
        .bind(deviceId)
        .first<{ profile_id: string | null }>();
      const deviceProfile = deviceRow?.profile_id ?? null;
      if (!deviceProfile || !allowedProfiles.includes(deviceProfile)) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  const limit = params.limit ?? 50;

  const alerts = await listAlerts(env, {
    status: params.status ?? undefined,
    severity: params.severity ?? undefined,
    device_id: deviceId,
    profile_id: singleProfile,
    profile_ids: profileIds,
    since: params.since ?? undefined,
    until: params.until ?? undefined,
    limit,
  });

  const meta = await fetchDeviceMeta(env, alerts.map((a) => a.device_id));
  const commentMap = await listAlertCommentsForAlerts(
    env,
    alerts.map((a) => a.alert_id),
  );
  const items = await Promise.all(
    alerts.map((record) =>
      presentAlertRecord(record, env, scope, meta, commentMap.get(record.alert_id) ?? []),
    ),
  );

  return json({
    generated_at: nowISO(),
    items,
  });
}

export async function handleCreateAlertRecord(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const logger = loggerForRequest(req, { route: "/api/alerts" });
  const scope = buildDeviceScope(user, "a");
  if (scope.empty && !scope.isAdmin) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = validateWithSchema<CreateAlertInput>(CreateAlertSchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;

  const deviceId = await resolveDeviceId(body.device_id, env, scope.isAdmin);
  if (!deviceId) {
    return json({ error: "Unknown device" }, { status: 404 });
  }

  let resolvedProfile = body.profile_id ?? null;

  if (!scope.isAdmin) {
    const allowedProfiles = scope.bind as string[];
    const deviceRow = await env.DB
      .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1 LIMIT 1`)
      .bind(deviceId)
      .first<{ profile_id: string | null }>();

    if (!deviceRow?.profile_id || !allowedProfiles.includes(deviceRow.profile_id)) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    if (resolvedProfile && resolvedProfile !== deviceRow.profile_id) {
      return json({ error: "Profile mismatch" }, { status: 400 });
    }

    resolvedProfile = deviceRow.profile_id;
  }

  const result = await createAlert(env, {
    alert_id: body.alert_id,
    device_id: deviceId,
    profile_id: resolvedProfile,
    alert_type: body.alert_type,
    severity: body.severity,
    status: body.status,
    summary: body.summary ?? null,
    description: body.description ?? null,
    metadata: body.metadata ?? null,
    acknowledged_at: body.acknowledged_at ?? null,
    resolved_at: body.resolved_at ?? null,
    resolved_by: body.resolved_by ?? null,
    assigned_to: body.assigned_to ?? null,
  });

  if (!result.ok) {
    if (result.reason === "device_not_found") {
      return json({ error: "Unknown device" }, { status: 404 });
    }
    if (result.reason === "conflict") {
      return json({ error: "Alert already exists" }, { status: 409 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }

  const meta = await fetchDeviceMeta(env, [result.alert.device_id]);
  const [alert] = await Promise.all([
    presentAlertRecord(result.alert, env, scope, meta, []),
  ]);

  await invalidateClientDashboardCache(env, result.alert.profile_id ?? null, logger);

  return json({ ok: true, alert }, { status: 201 });
}

export async function handleUpdateAlertRecord(req: Request, env: Env, alertId: string) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const logger = loggerForRequest(req, { route: "/api/alerts" });
  const scope = buildDeviceScope(user, "a");
  if (scope.empty && !scope.isAdmin) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await getAlert(env, alertId);
  if (!existing) {
    return json({ error: "Alert not found" }, { status: 404 });
  }

  if (!(await ensureAlertAccess(env, scope, existing))) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = validateWithSchema<AlertLifecycleActionInput>(AlertLifecycleActionSchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;

  const updateResult = await updateAlertLifecycle(env, {
    ...body,
    alert_id: alertId,
    actor_id: user.email,
    actor_email: user.email,
    comment: body.comment ?? null,
  });

  if (!updateResult.ok) {
    return json({ error: "Alert not found" }, { status: 404 });
  }

  const updatedAlert = updateResult.alert;
  const meta = await fetchDeviceMeta(env, [updatedAlert.device_id]);
  const comments = await listAlertComments(env, alertId);
  const presented = await presentAlertRecord(updatedAlert, env, scope, meta, comments);

  const auditExtras: Record<string, unknown> = {};
  if (body.comment) auditExtras.comment = body.comment;
  if ("assignee" in body) {
    auditExtras.assignee = (body as { assignee?: string }).assignee ?? null;
  }
  if (updateResult.comment) {
    auditExtras.comment_id = updateResult.comment.comment_id;
  }

  await recordAlertAudit(env, req, user.email, `alert.${body.action}`, updatedAlert, auditExtras);

  await invalidateClientDashboardCache(env, updatedAlert.profile_id ?? null, logger);

  return json({
    ok: true,
    alert: presented,
    comment: updateResult.comment ? presentAlertComment(updateResult.comment) : null,
  });
}

export async function handleCreateAlertComment(req: Request, env: Env, alertId: string) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const logger = loggerForRequest(req, { route: "/api/alerts" });
  const scope = buildDeviceScope(user, "a");
  if (scope.empty && !scope.isAdmin) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await getAlert(env, alertId);
  if (!existing) {
    return json({ error: "Alert not found" }, { status: 404 });
  }

  if (!(await ensureAlertAccess(env, scope, existing))) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = validateWithSchema<AlertCommentCreateInput>(AlertCommentCreateSchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;

  const commentRecord = await addAlertComment(env, {
    alert_id: alertId,
    action: "comment",
    body: body.comment,
    actor_id: user.email,
    actor_email: user.email,
    metadata: null,
  });

  const refreshed = await getAlert(env, alertId);
  if (!refreshed) {
    return json({ error: "Alert not found" }, { status: 404 });
  }

  const meta = await fetchDeviceMeta(env, [refreshed.device_id]);
  const comments = await listAlertComments(env, alertId);
  const presented = await presentAlertRecord(refreshed, env, scope, meta, comments);

  await recordAlertAudit(env, req, user.email, "alert.commented", refreshed, {
    comment_id: commentRecord.comment_id,
  });

  await invalidateClientDashboardCache(env, refreshed.profile_id ?? null, logger);

  return json({
    ok: true,
    alert: presented,
    comment: presentAlertComment(commentRecord),
  });
}
