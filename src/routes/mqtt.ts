import type { Env, User } from "../env";
import { requireAccessUser, userIsAdmin } from "../lib/access";
import {
  buildDeviceLookup,
  buildDeviceScope,
  fetchDeviceMeta,
  presentDeviceId,
  resolveDeviceId,
  type DeviceMeta,
} from "../lib/device";
import { json } from "../utils/responses";
import { nowISO, safeDecode } from "../utils";
import {
  MqttMappingsQuerySchema,
  CreateMqttMappingSchema,
  UpdateMqttMappingSchema,
  type MqttMappingsQuery,
  type CreateMqttMappingInput,
  type UpdateMqttMappingInput,
} from "../schemas/mqtt";
import { validationErrorResponse, validateWithSchema } from "../utils/validation";
import {
  createMqttMapping,
  listMqttMappings,
  updateMqttMapping,
  deleteMqttMapping,
  type MqttMappingRecord,
} from "../lib/mqtt-store";
import { createAuditEntry } from "../lib/audit-store";

async function presentMqttMapping(
  record: MqttMappingRecord,
  env: Env,
  scope: ReturnType<typeof buildDeviceScope>,
  meta: Map<string, DeviceMeta>,
) {
  let outwardId: string | null = null;
  let lookup: string | null = null;
  let site: string | null = null;
  const profile = record.profile_id ?? null;

  if (record.device_id) {
    outwardId = presentDeviceId(record.device_id, scope.isAdmin);
    lookup = await buildDeviceLookup(record.device_id, env, scope.isAdmin);
    const info = meta.get(record.device_id);
    site = info?.site ?? null;
  }

  return {
    mapping_id: record.mapping_id,
    device_id: outwardId,
    lookup,
    profile_id: profile,
    site,
    topic: record.topic,
    direction: record.direction,
    qos: record.qos,
    transform: record.transform,
    description: record.description,
    enabled: record.enabled,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function parseCursorParam(cursor: string | undefined) {
  if (!cursor) return null;
  const parts = cursor.split("|", 2);
  if (parts.length !== 2) return null;
  const created = safeDecode(parts[0]);
  const mappingId = safeDecode(parts[1]);
  if (!created || !mappingId) return null;
  if (Number.isNaN(Date.parse(created))) return null;
  return { created_at: created, mapping_id: mappingId };
}

function encodeCursorToken(mapping: Pick<MqttMappingRecord, "created_at" | "mapping_id">) {
  return `${encodeURIComponent(mapping.created_at)}|${encodeURIComponent(mapping.mapping_id)}`;
}

function requestIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    null
  );
}

function extractChanges(payload: UpdateMqttMappingInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

async function recordMqttAudit(
  env: Env,
  user: User,
  req: Request,
  action: string,
  mapping: MqttMappingRecord,
  extras?: Record<string, unknown>,
) {
  const result = await createAuditEntry(env, {
    actor_id: user.email,
    actor_email: user.email ?? null,
    actor_name: null,
    action,
    entity_type: "mqtt_mapping",
    entity_id: mapping.mapping_id,
    metadata: {
      topic: mapping.topic,
      direction: mapping.direction,
      profile_id: mapping.profile_id,
      device_id: mapping.device_id,
      enabled: mapping.enabled,
      ...extras,
    },
    ip_address: requestIp(req),
  });

  if (!result.ok) {
    throw new Error("Failed to create audit entry for MQTT mapping action");
  }
}

export async function handleListMqttMappings(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user || !userIsAdmin(user)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const paramsResult = validateWithSchema<MqttMappingsQuery>(MqttMappingsQuerySchema, {
    profile: url.searchParams.get("profile") ?? undefined,
    device: url.searchParams.get("device") ?? undefined,
    direction: url.searchParams.get("direction") ?? undefined,
    enabled: url.searchParams.get("enabled") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    topic: url.searchParams.get("topic") ?? undefined,
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.issues);
  }
  const params = paramsResult.data;

  const cursor = parseCursorParam(params.cursor);
  if (params.cursor && !cursor) {
    return json({ error: "Invalid cursor" }, { status: 400 });
  }

  let deviceId: string | undefined;
  if (params.device) {
    const resolved = await resolveDeviceId(params.device, env, true);
    if (!resolved) {
      return json({ error: "Unknown device" }, { status: 404 });
    }
    deviceId = resolved;
  }

  const limit = params.limit ?? 100;
  const { items, hasMore } = await listMqttMappings(env, {
    profile_id: params.profile ?? undefined,
    device_id: deviceId,
    direction: params.direction ?? undefined,
    enabled: typeof params.enabled === "boolean" ? params.enabled : undefined,
    topic: params.topic ?? undefined,
    cursor: cursor ?? undefined,
    limit,
  });

  const scope = buildDeviceScope(user, "mm");
  const meta = await fetchDeviceMeta(
    env,
    items.filter((m) => m.device_id).map((m) => m.device_id as string),
  );
  const presented = await Promise.all(items.map((m) => presentMqttMapping(m, env, scope, meta)));

  let next: string | null = null;
  if (hasMore && items.length) {
    next = encodeCursorToken(items[items.length - 1]);
  }

  return json({
    generated_at: nowISO(),
    mappings: presented,
    next,
  });
}

export async function handleCreateMqttMapping(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user || !userIsAdmin(user)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = validateWithSchema<CreateMqttMappingInput>(CreateMqttMappingSchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;

  let deviceId: string | null = null;
  if (body.device_id) {
    const resolved = await resolveDeviceId(body.device_id, env, true);
    if (!resolved) {
      return json({ error: "Unknown device" }, { status: 404 });
    }
    deviceId = resolved;
  }

  const result = await createMqttMapping(env, {
    mapping_id: body.mapping_id,
    device_id: deviceId,
    profile_id: body.profile_id ?? null,
    topic: body.topic,
    direction: body.direction,
    qos: body.qos ?? 0,
    transform: body.transform ?? null,
    description: body.description ?? null,
    enabled: body.enabled ?? true,
  });

  if (!result.ok) {
    if (result.reason === "conflict") {
      return json({ error: "Mapping already exists for topic/profile/direction" }, { status: 409 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }

  const scope = buildDeviceScope(user, "mm");
  const meta = await fetchDeviceMeta(
    env,
    result.mapping.device_id ? [result.mapping.device_id] : [],
  );
  const presented = await presentMqttMapping(result.mapping, env, scope, meta);

  await recordMqttAudit(env, user, req, "mqtt.mapping.created", result.mapping);

  return json({ ok: true, mapping: presented }, { status: 201 });
}

export async function handleUpdateMqttMapping(req: Request, env: Env, mappingId: string) {
  const user = await requireAccessUser(req, env);
  if (!user || !userIsAdmin(user)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = validateWithSchema<UpdateMqttMappingInput>(UpdateMqttMappingSchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;

  const updateParams: Parameters<typeof updateMqttMapping>[1] = {
    mapping_id: mappingId,
  };

  const hasOwn = Object.prototype.hasOwnProperty;

  if (hasOwn.call(body, "device_id")) {
    const raw = body.device_id;
    if (raw === null) {
      updateParams.device_id = null;
    } else if (typeof raw === "string") {
      const resolved = await resolveDeviceId(raw, env, true);
      if (!resolved) {
        return json({ error: "Unknown device" }, { status: 404 });
      }
      updateParams.device_id = resolved;
    }
  }

  if (hasOwn.call(body, "profile_id")) {
    updateParams.profile_id = body.profile_id ?? null;
  }

  if (hasOwn.call(body, "topic")) {
    updateParams.topic = body.topic;
  }

  if (hasOwn.call(body, "direction")) {
    updateParams.direction = body.direction;
  }

  if (hasOwn.call(body, "qos")) {
    updateParams.qos = body.qos ?? 0;
  }

  if (hasOwn.call(body, "transform")) {
    updateParams.transform = body.transform ?? null;
  }

  if (hasOwn.call(body, "description")) {
    updateParams.description = body.description ?? null;
  }

  if (hasOwn.call(body, "enabled")) {
    updateParams.enabled = body.enabled ?? false;
  }

  const result = await updateMqttMapping(env, updateParams);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return json({ error: "Mapping not found" }, { status: 404 });
    }
    if (result.reason === "conflict") {
      return json({ error: "Mapping already exists for topic/profile/direction" }, { status: 409 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }

  const scope = buildDeviceScope(user, "mm");
  const meta = await fetchDeviceMeta(
    env,
    result.mapping.device_id ? [result.mapping.device_id] : [],
  );
  const presented = await presentMqttMapping(result.mapping, env, scope, meta);

  await recordMqttAudit(env, user, req, "mqtt.mapping.updated", result.mapping, {
    changes: extractChanges(body),
  });

  return json({ ok: true, mapping: presented });
}

export async function handleDeleteMqttMapping(req: Request, env: Env, mappingId: string) {
  const user = await requireAccessUser(req, env);
  if (!user || !userIsAdmin(user)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await deleteMqttMapping(env, mappingId);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return json({ error: "Mapping not found" }, { status: 404 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }

  const scope = buildDeviceScope(user, "mm");
  const meta = await fetchDeviceMeta(
    env,
    result.mapping.device_id ? [result.mapping.device_id] : [],
  );
  const presented = await presentMqttMapping(result.mapping, env, scope, meta);

  await recordMqttAudit(env, user, req, "mqtt.mapping.deleted", result.mapping);

  return json({ ok: true, mapping: presented });
}
