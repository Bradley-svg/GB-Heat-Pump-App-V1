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
  CommissioningRunsQuerySchema,
  CreateCommissioningRunSchema,
  type CommissioningRunsQuery,
  type CreateCommissioningRunInput,
} from "../schemas/commissioning";
import { validationErrorResponse, validateWithSchema } from "../utils/validation";
import {
  createCommissioningRun,
  listCommissioningRuns,
  type CommissioningRunRecord,
} from "../lib/commissioning-store";

async function presentRun(
  record: CommissioningRunRecord,
  env: Env,
  scope: ReturnType<typeof buildDeviceScope>,
  meta: Map<string, DeviceMeta>,
) {
  const info = meta.get(record.device_id);
  const outwardId = presentDeviceId(record.device_id, scope.isAdmin);
  const lookup = await buildDeviceLookup(record.device_id, env, scope.isAdmin);
  return {
    run_id: record.run_id,
    device_id: outwardId,
    lookup,
    profile_id: record.profile_id ?? info?.profile_id ?? null,
    site: info?.site ?? null,
    status: record.status,
    started_at: record.started_at,
    completed_at: record.completed_at,
    checklist: record.checklist,
    notes: record.notes,
    performed_by: record.performed_by,
    report_url: record.report_url,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export async function handleListCommissioningRuns(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user, "cr");
  if (scope.empty && !scope.isAdmin) {
    return json({ generated_at: nowISO(), runs: [] });
  }

  const url = new URL(req.url);
  const paramsResult = validateWithSchema<CommissioningRunsQuery>(CommissioningRunsQuerySchema, {
    status: url.searchParams.get("status") ?? undefined,
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
  let profileId: string | undefined;

  if (scope.isAdmin) {
    if (params.profile) profileId = params.profile;
  } else {
    const allowedProfiles = scope.bind as string[];
    if (!allowedProfiles.length) {
      return json({ generated_at: nowISO(), runs: [] });
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

  const runs = await listCommissioningRuns(env, {
    status: params.status ?? undefined,
    device_id: deviceId,
    profile_id: profileId,
    profile_ids: profileIds,
    since: params.since ?? undefined,
    until: params.until ?? undefined,
    limit,
  });

  const meta = await fetchDeviceMeta(env, runs.map((run) => run.device_id));
  const items = await Promise.all(runs.map((run) => presentRun(run, env, scope, meta)));

  return json({
    generated_at: nowISO(),
    runs: items,
  });
}

export async function handleCreateCommissioningRun(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildDeviceScope(user, "cr");
  if (scope.empty && !scope.isAdmin) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = validateWithSchema<CreateCommissioningRunInput>(CreateCommissioningRunSchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;

  const deviceId = await resolveDeviceId(body.device_id, env, scope.isAdmin);
  if (!deviceId) {
    return json({ error: "Unknown device" }, { status: 404 });
  }

  if (body.completed_at && body.started_at) {
    const startedMs = Date.parse(body.started_at);
    const completedMs = Date.parse(body.completed_at);
    if (!Number.isNaN(startedMs) && !Number.isNaN(completedMs) && completedMs < startedMs) {
      return json({ error: "Invalid lifecycle timestamps" }, { status: 400 });
    }
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

  const result = await createCommissioningRun(env, {
    run_id: body.run_id,
    device_id: deviceId,
    profile_id: resolvedProfile,
    status: body.status,
    started_at: body.started_at,
    completed_at: body.completed_at ?? null,
    checklist: body.checklist ?? null,
    notes: body.notes ?? null,
    performed_by: body.performed_by ?? null,
    report_url: body.report_url ?? null,
  });

  if (!result.ok) {
    if (result.reason === "device_not_found") {
      return json({ error: "Unknown device" }, { status: 404 });
    }
    if (result.reason === "conflict") {
      return json({ error: "Run already exists" }, { status: 409 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }

  const meta = await fetchDeviceMeta(env, [result.run.device_id]);
  const [run] = await Promise.all([presentRun(result.run, env, scope, meta)]);

  return json({ ok: true, run }, { status: 201 });
}
