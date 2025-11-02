import { z } from "zod";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ]),
);

export const MqttWebhookPayloadSchema = z
  .object({
    topic: z.string().trim().min(1),
    payload: JsonValueSchema,
    qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    retain: z.boolean().optional(),
    mapping_id: z.string().trim().min(1).optional(),
    profile_id: z.string().trim().min(1).optional(),
    properties: z.record(JsonValueSchema).optional(),
    published_at: z.string().trim().min(1).optional(),
  })
  .strict();

export type MqttWebhookPayload = z.infer<typeof MqttWebhookPayloadSchema>;
