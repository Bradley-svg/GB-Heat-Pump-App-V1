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
import { nowISO } from "../utils";
import {
  MqttMappingsQuerySchema,
  CreateMqttMappingSchema,
  type MqttMappingsQuery,
  type CreateMqttMappingInput,
} from "../schemas/mqtt";
import { validationErrorResponse, validateWithSchema } from "../utils/validation";
import { createMqttMapping, listMqttMappings } from "../lib/mqtt-store";

async function presentMqttMapping(
  record: Awaited<ReturnType<typeof listMqttMappings>>[number],
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

export async function handleListMqttMappings(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user, "mm");
  if (scope.empty && !scope.isAdmin) {
    return json({ generated_at: nowISO(), mappings: [] });
  }

  const url = new URL(req.url);
  const paramsResult = validateWithSchema<MqttMappingsQuery>(MqttMappingsQuerySchema, {
    profile: url.searchParams.get("profile") ?? undefined,
    device: url.searchParams.get("device") ?? undefined,
    direction: url.searchParams.get("direction") ?? undefined,
    enabled: url.searchParams.get("enabled") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.issues);
  }
  const params = paramsResult.data;

  let deviceId: string | undefined;
  if (params.device) {
    const resolved = await resolveDeviceId(params.device, env, scope.isAdmin);
    if (!resolved) {
      return json({ error: "Unknown device" }, { status: 404 });
    }
    deviceId = resolved;
  }

  let profileIds: string[] | undefined;
  let singleProfile: string | undefined;

  if (scope.isAdmin) {
    if (params.profile) singleProfile = params.profile;
  } else {
    const allowedProfiles = scope.bind as string[];
    if (!allowedProfiles.length) {
      return json({ generated_at: nowISO(), mappings: [] });
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

  const limit = params.limit ?? 100;

  const mappings = await listMqttMappings(env, {
    profile_id: singleProfile,
    profile_ids: profileIds,
    device_id: deviceId,
    direction: params.direction ?? undefined,
    enabled: typeof params.enabled === "boolean" ? params.enabled : undefined,
    limit,
  });

  const meta = await fetchDeviceMeta(
    env,
    mappings.filter((m) => m.device_id).map((m) => m.device_id as string),
  );
  const items = await Promise.all(mappings.map((m) => presentMqttMapping(m, env, scope, meta)));

  return json({
    generated_at: nowISO(),
    mappings: items,
  });
}

export async function handleCreateMqttMapping(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user, "mm");
  if (scope.empty && !scope.isAdmin) {
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
    const resolved = await resolveDeviceId(body.device_id, env, scope.isAdmin);
    if (!resolved) {
      return json({ error: "Unknown device" }, { status: 404 });
    }
    deviceId = resolved;
  }

  let resolvedProfile = body.profile_id ?? null;

  if (!scope.isAdmin) {
    const allowedProfiles = scope.bind as string[];
    if (deviceId) {
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
    } else if (resolvedProfile) {
      if (!allowedProfiles.includes(resolvedProfile)) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      return json({ error: "Profile required" }, { status: 400 });
    }
  }

  const result = await createMqttMapping(env, {
    mapping_id: body.mapping_id,
    device_id: deviceId,
    profile_id: resolvedProfile,
    topic: body.topic,
    direction: body.direction,
    qos: body.qos,
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

  const meta = deviceId ? await fetchDeviceMeta(env, [deviceId]) : new Map<string, DeviceMeta>();
  const [mapping] = await Promise.all([
    presentMqttMapping(result.mapping, env, scope, meta),
  ]);

  return json({ ok: true, mapping }, { status: 201 });
}
