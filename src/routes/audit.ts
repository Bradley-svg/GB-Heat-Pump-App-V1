import type { Env } from "../env";
import { requireAccessUser, userIsAdmin } from "../lib/access";
import { json } from "../utils/responses";
import { nowISO } from "../utils";
import {
  AuditTrailQuerySchema,
  CreateAuditEntrySchema,
  type AuditTrailQuery,
  type CreateAuditEntryInput,
} from "../schemas/audit";
import { validationErrorResponse, validateWithSchema } from "../utils/validation";
import { createAuditEntry, listAuditTrail } from "../lib/audit-store";

export async function handleListAuditTrail(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user || !userIsAdmin(user)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const paramsResult = validateWithSchema<AuditTrailQuery>(AuditTrailQuerySchema, {
    entity_type: url.searchParams.get("entity_type") ?? undefined,
    entity_id: url.searchParams.get("entity_id") ?? undefined,
    actor_id: url.searchParams.get("actor_id") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
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

  const limit = params.limit ?? 100;

  const entries = await listAuditTrail(env, {
    entity_type: params.entity_type ?? undefined,
    entity_id: params.entity_id ?? undefined,
    actor_id: params.actor_id ?? undefined,
    action: params.action ?? undefined,
    since: params.since ?? undefined,
    until: params.until ?? undefined,
    limit,
  });

  return json({
    generated_at: nowISO(),
    entries,
  });
}

export async function handleCreateAuditEntry(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = validateWithSchema<CreateAuditEntryInput>(CreateAuditEntrySchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;

  const ip =
    body.ip_address ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for") ??
    null;

  const result = await createAuditEntry(env, {
    audit_id: body.audit_id,
    actor_id: body.actor_id,
    actor_email: body.actor_email ?? null,
    actor_name: body.actor_name ?? null,
    action: body.action,
    entity_type: body.entity_type ?? null,
    entity_id: body.entity_id ?? null,
    metadata: body.metadata ?? null,
    ip_address: ip,
    created_at: body.created_at,
  });

  if (!result.ok) {
    if (result.reason === "conflict") {
      return json({ error: "Audit entry already exists" }, { status: 409 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }

  return json({ ok: true, audit: result.audit }, { status: 201 });
}
