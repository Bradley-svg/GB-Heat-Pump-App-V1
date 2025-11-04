import { z } from "zod";
import { numericParam, optionalTrimmedString } from "./params";

export const MQTT_DIRECTIONS = ["ingress", "egress"] as const;

export const MqttDirectionSchema = z.enum(MQTT_DIRECTIONS);

const enabledParam = z
  .union([z.boolean(), z.literal("true"), z.literal("false")])
  .transform((value: boolean | "true" | "false") => {
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
    cursor: optionalTrimmedString,
    topic: optionalTrimmedString,
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
    transform: z.union([z.record(z.any()), z.null()]).optional(),
    description: z.union([z.string().trim().min(1).max(512), z.null()]).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export type MqttMappingsQuery = z.infer<typeof MqttMappingsQuerySchema>;
export type CreateMqttMappingInput = z.infer<typeof CreateMqttMappingSchema>;

const optionalNullableString = z
  .union([z.string().trim().min(1), z.null()])
  .optional();

const optionalNullableRecord = z.union([z.record(z.any()), z.null()]).optional();

export const UpdateMqttMappingSchema = z
  .object({
    device_id: optionalNullableString,
    profile_id: optionalNullableString,
    topic: z.string().trim().min(1).optional(),
    direction: MqttDirectionSchema.optional(),
    qos: z.union([z.number().int().min(0).max(2), z.literal(0), z.literal(1), z.literal(2)]).optional(),
    transform: optionalNullableRecord,
    description: optionalNullableString,
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine((data: Record<string, unknown>) => Object.keys(data).length > 0, {
    message: "At least one property must be provided.",
  });

export type UpdateMqttMappingInput = z.infer<typeof UpdateMqttMappingSchema>;
