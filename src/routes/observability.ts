import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { ClientErrorReportSchema, ClientEventReportSchema } from "../schemas/observability";
import type { ClientErrorReport, ClientEventReport } from "../schemas/observability";
import { loggerForRequest } from "../utils/logging";
import { json } from "../utils/responses";
import { validationErrorResponse, validateWithSchema } from "../utils/validation";
import { checkIpRateLimit } from "../lib/ip-rate-limit";

const ROUTE_PATH = "/api/observability/client-errors";
const EVENTS_ROUTE_PATH = "/api/observability/client-events";
const DEFAULT_MAX_PAYLOAD_BYTES = 16_384;
const STACK_MAX_CHARS = 4_096;
const COMPONENT_STACK_MAX_CHARS = 4_096;
const MESSAGE_MAX_CHARS = 2_048;
const EXTRAS_MAX_BYTES = 4_096;
const encoder = new TextEncoder();

export async function handleClientErrorReport(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const maxBytes = resolveMaxPayloadBytes(env);
  if (encoder.encode(rawBody).length > maxBytes) {
    return json({ error: "Payload too large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validateWithSchema<ClientErrorReport>(ClientErrorReportSchema, payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.issues);
  }

  const body = parsed.data;
  const log = loggerForRequest(req, { route: ROUTE_PATH });

  const sanitized = sanitizeClientErrorReport(body);

  const userContext = {
    email: user.email,
    roles: user.roles,
    client_ids: user.clientIds,
  };

  const logPayload: Record<string, unknown> = {
    source: "frontend",
    report: sanitized.report,
    user: userContext,
  };

  if (sanitized.truncatedFields.length) {
    logPayload.truncated_fields = sanitized.truncatedFields;
  }

  log.error("ui.error_boundary", logPayload);

  return json({ ok: true }, { status: 202 });
}

export async function handleClientEventReport(req: Request, env: Env) {
  const rateLimit = await checkIpRateLimit(req, env, EVENTS_ROUTE_PATH, {
    limitEnvKey: "AUTH_IP_LIMIT_PER_MIN",
    blockEnvKey: "AUTH_IP_BLOCK_SECONDS",
    kvBindingKey: "AUTH_IP_BUCKETS",
    defaultLimit: 120,
    defaultBlockSeconds: 60,
  });
  if (rateLimit?.limited) {
    const response = json({ error: "Rate limit exceeded" }, { status: 429 });
    if (rateLimit.retryAfterSeconds != null) {
      response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    }
    return response;
  }

  const user = await requireAccessUser(req, env);
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = validateWithSchema<ClientEventReport>(ClientEventReportSchema, payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.issues);
  }
  const body = parsed.data;
  const log = loggerForRequest(req, { route: EVENTS_ROUTE_PATH });
  log.info("client.event", {
    event: body.event,
    source: body.source ?? "unknown",
    properties: body.properties ?? {},
    user_email: user.email,
  });
  return json({ ok: true }, { status: 202 });
}

function resolveMaxPayloadBytes(env: Env): number {
  const raw = env.OBSERVABILITY_MAX_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_PAYLOAD_BYTES;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_MAX_PAYLOAD_BYTES;
}

function sanitizeClientErrorReport(body: ClientErrorReport) {
  const truncatedFields: string[] = [];

  const report = {
    name: body.name ?? null,
    message: truncateString(body.message, MESSAGE_MAX_CHARS, truncatedFields, "message"),
    stack: truncateString(body.stack, STACK_MAX_CHARS, truncatedFields, "stack"),
    component_stack: truncateString(
      body.componentStack,
      COMPONENT_STACK_MAX_CHARS,
      truncatedFields,
      "component_stack",
    ),
    user_agent: body.userAgent ?? null,
    url: body.url ?? null,
    timestamp: body.timestamp ?? new Date().toISOString(),
    release: body.release ?? null,
    tags: body.tags ?? null,
    extras: sanitizeExtras(body.extras, truncatedFields),
    reporter_user: body.user ?? null,
  };

  return { report, truncatedFields };
}

function truncateString(
  value: string | null | undefined,
  maxLength: number,
  truncatedFields: string[],
  fieldName: string,
): string | null {
  if (typeof value !== "string") return value ?? null;
  if (value.length <= maxLength) return value;
  truncatedFields.push(fieldName);
  return `${value.slice(0, maxLength)}...`;
}

function sanitizeExtras(extras: unknown, truncatedFields: string[]) {
  if (extras === undefined) return undefined;
  if (extras === null) return null;
  try {
    const serialized = JSON.stringify(extras);
    if (encoder.encode(serialized).length <= EXTRAS_MAX_BYTES) {
      return extras;
    }
    truncatedFields.push("extras");
    return {
      truncated: true,
      bytes: encoder.encode(serialized).length,
      note: `extras truncated above ${EXTRAS_MAX_BYTES} bytes`,
    };
  } catch {
    truncatedFields.push("extras");
    return {
      truncated: true,
      note: "extras could not be serialized",
    };
  }
}
