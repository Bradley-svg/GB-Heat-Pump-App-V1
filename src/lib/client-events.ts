import type { Env } from "../env";
import { nowISO } from "../utils";

const MAX_PROPERTIES_BYTES = 4096;
const encoder = new TextEncoder();

export interface ClientEventRecord {
  event: string;
  source?: string | null;
  userEmail?: string | null;
  dimension?: string | null;
  properties?: Record<string, unknown> | null;
}

export async function recordClientEvent(env: Env, record: ClientEventRecord): Promise<void> {
  const createdAt = nowISO();
  const id = crypto.randomUUID();
  const propertiesJson = serializeProperties(record.properties);

  await env.DB.prepare(
    `INSERT INTO client_events (id, created_at, event, source, user_email, dimension, properties)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(
      id,
      createdAt,
      record.event,
      sanitizeText(record.source),
      sanitizeText(record.userEmail),
      sanitizeText(record.dimension),
      propertiesJson,
    )
    .run();
}

function serializeProperties(
  properties: Record<string, unknown> | null | undefined,
): string | null {
  if (!properties) return null;
  try {
    const json = JSON.stringify(properties);
    if (!json) return null;
    if (encoder.encode(json).length <= MAX_PROPERTIES_BYTES) {
      return json;
    }
    return truncateJson(json);
  } catch {
    return null;
  }
}

function truncateJson(payload: string): string {
  if (!payload) return payload;
  const end = Math.max(
    1,
    Math.floor((MAX_PROPERTIES_BYTES / encoder.encode(payload).length) * payload.length),
  );
  let candidate = payload.slice(0, end);
  while (candidate.length > 0 && encoder.encode(candidate).length > MAX_PROPERTIES_BYTES) {
    candidate = candidate.slice(0, -1);
  }
  return candidate;
}

function sanitizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
