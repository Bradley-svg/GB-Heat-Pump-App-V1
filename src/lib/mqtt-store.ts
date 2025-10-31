import type { Env } from "../env";
import { andWhere, nowISO } from "../utils";

export interface MqttMappingRecord {
  mapping_id: string;
  device_id: string | null;
  profile_id: string | null;
  topic: string;
  direction: string;
  qos: number;
  transform: Record<string, unknown> | null;
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMqttMappingParams {
  mapping_id?: string;
  device_id?: string | null;
  profile_id?: string | null;
  topic: string;
  direction: string;
  qos?: number;
  transform?: Record<string, unknown> | null;
  description?: string | null;
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CreateMqttMappingResult =
  | { ok: true; mapping: MqttMappingRecord }
  | { ok: false; reason: "conflict" };

export interface MqttMappingFilters {
  profile_id?: string;
  profile_ids?: string[];
  device_id?: string;
  direction?: string;
  enabled?: boolean;
  limit: number;
}

interface MqttRow {
  mapping_id: string;
  device_id: string | null;
  profile_id: string | null;
  topic: string;
  direction: string;
  qos: number;
  transform_json: string | null;
  description: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

function mapMqttRow(row: MqttRow): MqttMappingRecord {
  let transform: Record<string, unknown> | null = null;
  if (row.transform_json) {
    try {
      const parsed = JSON.parse(row.transform_json);
      if (parsed && typeof parsed === "object") {
        transform = parsed as Record<string, unknown>;
      }
    } catch {
      transform = null;
    }
  }
  return {
    mapping_id: row.mapping_id,
    device_id: row.device_id,
    profile_id: row.profile_id,
    topic: row.topic,
    direction: row.direction,
    qos: Number(row.qos ?? 0),
    transform,
    description: row.description,
    enabled: row.enabled === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function createMqttMapping(
  env: Env,
  params: CreateMqttMappingParams,
): Promise<CreateMqttMappingResult> {
  const id = params.mapping_id ?? crypto.randomUUID();
  const createdAt = params.created_at ?? nowISO();
  const updatedAt = params.updated_at ?? createdAt;
  const deviceId = params.device_id ?? null;
  const profileId = params.profile_id ?? null;
  const qos = params.qos ?? 0;
  const transformJson = params.transform ? JSON.stringify(params.transform) : null;
  const description = params.description ?? null;
  const enabled = params.enabled ?? true;

  try {
    await env.DB
      .prepare(
        `INSERT INTO mqtt_mappings (
            mapping_id, device_id, profile_id, topic, direction,
            qos, transform_json, description, enabled, created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      )
      .bind(
        id,
        deviceId,
        profileId,
        params.topic,
        params.direction,
        qos,
        transformJson,
        description,
        enabled ? 1 : 0,
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
    .prepare(`SELECT * FROM mqtt_mappings WHERE mapping_id = ?1 LIMIT 1`)
    .bind(id)
    .first<MqttRow>();

  if (!row) {
    return { ok: false, reason: "conflict" };
  }

  return { ok: true, mapping: mapMqttRow(row) };
}

export async function listMqttMappings(
  env: Env,
  filters: MqttMappingFilters,
): Promise<MqttMappingRecord[]> {
  let where = "";
  const bind: any[] = [];

  if (filters.profile_ids && filters.profile_ids.length) {
    const placeholders = filters.profile_ids.map(() => "?").join(",");
    where = andWhere(where, `profile_id IN (${placeholders})`);
    bind.push(...filters.profile_ids);
  } else if (filters.profile_id) {
    where = andWhere(where, "profile_id = ?");
    bind.push(filters.profile_id);
  }

  if (filters.device_id) {
    where = andWhere(where, "device_id = ?");
    bind.push(filters.device_id);
  }

  if (filters.direction) {
    where = andWhere(where, "direction = ?");
    bind.push(filters.direction);
  }

  if (typeof filters.enabled === "boolean") {
    where = andWhere(where, "enabled = ?");
    bind.push(filters.enabled ? 1 : 0);
  }

  const sql = `SELECT * FROM mqtt_mappings ${where} ORDER BY created_at DESC LIMIT ?`;
  bind.push(filters.limit);

  const rows = await env.DB.prepare(sql).bind(...bind).all<MqttRow>();
  return (rows.results ?? []).map(mapMqttRow);
}
