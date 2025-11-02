import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { storeMqttWebhookMessage } from "../lib/mqtt-store";
import { parseAndCheckTs, nowISO } from "../utils";
import { loggerForRequest } from "../utils/logging";
import { json } from "../utils/responses";
import { validationErrorResponse } from "../utils/validation";
import { MqttWebhookPayloadSchema, type MqttWebhookPayload } from "../schemas/mqtt-webhook";

const ROUTE_PATH = "/api/mqtt-webhook";
const BODY_LIMIT_BYTES = 256_000;
const textEncoder = new TextEncoder();

function payloadWithinLimit(raw: string) {
  return textEncoder.encode(raw).length <= BODY_LIMIT_BYTES;
}

function readJson(raw: string): unknown {
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function handleMqttWebhook(req: Request, env: Env) {
  const log = loggerForRequest(req, { route: ROUTE_PATH });
  const user = await requireAccessUser(req, env);
  if (!user) {
    log.warn("mqtt.webhook.unauthorized");
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (error) {
    log.warn("mqtt.webhook.body_read_failed", { error });
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payloadWithinLimit(rawBody)) {
    log.warn("mqtt.webhook.payload_too_large");
    return json({ error: "Payload too large" }, { status: 413 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = readJson(rawBody);
  } catch (error) {
    log.warn("mqtt.webhook.json_invalid", { error });
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payloadResult = MqttWebhookPayloadSchema.safeParse(parsedBody);
  if (!payloadResult.success) {
    log.warn("mqtt.webhook.validation_failed", { issues: payloadResult.error.issues });
    return validationErrorResponse(payloadResult.error);
  }

  const payload: MqttWebhookPayload = payloadResult.data;
  let publishedAtIso = nowISO();
  if (payload.published_at) {
    const tsCheck = parseAndCheckTs(payload.published_at);
    if (!tsCheck.ok || typeof tsCheck.ms !== "number") {
      log.warn("mqtt.webhook.timestamp_invalid", { reason: tsCheck.reason });
      return json({ error: tsCheck.reason ?? "Invalid timestamp" }, { status: 400 });
    }
    publishedAtIso = new Date(tsCheck.ms).toISOString();
  }

  const qos = payload.qos ?? 0;
  const retain = payload.retain ?? false;

  const queueEvent = {
    topic: payload.topic,
    payload: payload.payload,
    qos,
    retain,
    mapping_id: payload.mapping_id ?? null,
    profile_id: payload.profile_id ?? null,
    properties: payload.properties ?? null,
    published_at: publishedAtIso,
    actor_email: user.email ?? null,
    received_at: nowISO(),
  };

  if (env.MQTT_WEBHOOK_QUEUE) {
    try {
      await env.MQTT_WEBHOOK_QUEUE.send(JSON.stringify(queueEvent));
      log.info("mqtt.webhook.queued", {
        topic: queueEvent.topic,
        profile_id: queueEvent.profile_id,
        mapping_id: queueEvent.mapping_id,
      });
      return json(
        {
          ok: true,
          delivery: "queue",
        },
        { status: 202 },
      );
    } catch (error) {
      log.error("mqtt.webhook.queue_failed", { error });
    }
  }

  const record = await storeMqttWebhookMessage(env, {
    topic: payload.topic,
    payload: payload.payload,
    qos,
    retain,
    properties: payload.properties ?? null,
    mappingId: payload.mapping_id ?? null,
    profileId: payload.profile_id ?? null,
    actorEmail: user.email ?? null,
    receivedAt: publishedAtIso,
  });

  log.info("mqtt.webhook.stored", {
    message_id: record.message_id,
    topic: record.topic,
    profile_id: record.profile_id,
    mapping_id: record.mapping_id,
    delivery: env.MQTT_WEBHOOK_QUEUE ? "store_fallback" : "store",
  });

  return json(
    {
      ok: true,
      delivery: env.MQTT_WEBHOOK_QUEUE ? "store_fallback" : "store",
      message_id: record.message_id,
    },
    { status: env.MQTT_WEBHOOK_QUEUE ? 202 : 201 },
  );
}
