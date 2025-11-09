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
    const encodedLength = encoder.encode(json).length;
    if (encodedLength <= MAX_PROPERTIES_BYTES) {
      return json;
    }
    const truncatedPayload = {
      truncated: true,
      bytes: encodedLength,
      note: `properties truncated above ${MAX_PROPERTIES_BYTES} bytes`,
      preview: json.slice(0, 256),
    };
    return JSON.stringify(truncatedPayload);
  } catch {
    return null;
  }
}

function sanitizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export const __testables = {
  serializeProperties,
  MAX_PROPERTIES_BYTES,
};
