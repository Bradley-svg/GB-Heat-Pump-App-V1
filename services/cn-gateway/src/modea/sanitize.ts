import { DROP_FIELDS, EMBEDDED_IDENTIFIER_REGEX, SAFE_METRICS } from "./drop-safe.js";
import type { TelemetryPayload } from "../validators/common.js";

export class SanitizationError extends Error {
  statusCode = 422;
  constructor(message: string) {
    super(message);
    this.name = "SanitizationError";
  }
}

const forbiddenSet = new Set(DROP_FIELDS.map((item) => item.toLowerCase()));

function scan(value: unknown, lineage: string[] = []) {
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (forbiddenSet.has(key.toLowerCase())) {
        throw new SanitizationError(`forbidden_field:${[...lineage, key].join(".")}`);
      }
      scan(nested, [...lineage, key]);
    }
    return;
  }

  if (typeof value === "string") {
    const regex = new RegExp(EMBEDDED_IDENTIFIER_REGEX);
    regex.lastIndex = 0;
    if (regex.test(value)) {
      throw new SanitizationError("embedded_identifier_detected");
    }
  }
}

function minuteIso(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new SanitizationError("invalid_timestamp");
  }
  date.setSeconds(0, 0);
  return date.toISOString();
}

function normalizeCode(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_:-]/g, "")
    .slice(0, 32);
}

export function sanitizeTelemetry(payload: TelemetryPayload): TelemetryPayload {
  scan(payload);

  const roundedTimestamp = minuteIso(payload.timestamp);
  const sanitizedMetrics: Record<string, number | string> = {};
  for (const safeKey of SAFE_METRICS) {
    const value = payload.metrics[safeKey];
    if (value === undefined) {
      continue;
    }
    if (typeof value === "number" || typeof value === "string") {
      sanitizedMetrics[safeKey] = value;
    }
  }

  if (payload.metrics.status_code) {
    const normalized = normalizeCode(String(payload.metrics.status_code));
    if (normalized) {
      sanitizedMetrics.status_code = normalized;
    }
  }
  if (payload.metrics.fault_code) {
    const normalized = normalizeCode(String(payload.metrics.fault_code));
    if (normalized) {
      sanitizedMetrics.fault_code = normalized;
    }
  }
  sanitizedMetrics.timestamp_minute = roundedTimestamp.replace(/:\d{2}\.\d{3}Z$/, ":00Z");

  return {
    deviceId: payload.deviceId,
    seq: payload.seq,
    timestamp: roundedTimestamp,
    metrics: sanitizedMetrics as TelemetryPayload["metrics"]
  };
}
