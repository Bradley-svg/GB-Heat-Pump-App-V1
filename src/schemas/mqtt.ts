import { z } from "zod";
import { numericParam } from "./params";

export const MQTT_DIRECTIONS = ["ingress", "egress"] as const;

export const MqttDirectionSchema = z.enum(MQTT_DIRECTIONS);

const enabledParam = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    return value === "true";
  });

export const MqttMappingsQuerySchema = z
  .object({
    profile: z.string().trim().min(1).optional(),
    device: z.string().trim().min(1).optional(),
    direction: MqttDirectionSchema.optional(),
    enabled: enabledParam.optional(),
    limit: numericParam({ integer: true, min: 1, max: 200, defaultValue: 100 }),
  })
  .strict();

export const CreateMqttMappingSchema = z
  .object({
    mapping_id: z.string().trim().min(1).optional(),
    device_id: z.string().trim().min(1).optional(),
    profile_id: z.string().trim().min(1).optional(),
    topic: z.string().trim().min(1),
    direction: MqttDirectionSchema,
    qos: z.union([z.number().int().min(0).max(2), z.literal(0), z.literal(1), z.literal(2)]).default(0),
    transform: z.record(z.any()).optional(),
    description: z.string().trim().min(1).max(512).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export type MqttMappingsQuery = z.infer<typeof MqttMappingsQuerySchema>;
export type CreateMqttMappingInput = z.infer<typeof CreateMqttMappingSchema>;
