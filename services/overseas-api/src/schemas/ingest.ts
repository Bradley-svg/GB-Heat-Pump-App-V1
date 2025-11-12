import { z } from "zod";

const nullableNumber = z
  .union([z.number(), z.null()])
  .optional()
  .transform((value: number | null | undefined) =>
    value === undefined ? null : value,
  );

const nullableString = z
  .union([z.string().min(1), z.null()])
  .optional()
  .transform((value: string | null | undefined) =>
    value === undefined ? null : value,
  );

export const TelemetryMetricsSchema = z
  .object({
    supplyC: nullableNumber,
    returnC: nullableNumber,
    tankC: nullableNumber,
    ambientC: nullableNumber,
    flowLps: nullableNumber,
    compCurrentA: nullableNumber,
    eevSteps: nullableNumber,
    powerKW: nullableNumber,
    mode: nullableString,
    defrost: nullableNumber,
  })
  .strict();

export const TelemetryPayloadSchema = z
  .object({
    device_id: z.string().min(1, "device_id must not be empty"),
    ts: z.string().min(1, "ts must not be empty"),
    metrics: TelemetryMetricsSchema,
    faults: z.array(z.string()).default([]),
    rssi: nullableNumber,
  })
  .strict();

export type TelemetryPayload = z.infer<typeof TelemetryPayloadSchema>;

export const HeartbeatPayloadSchema = z
  .object({
    device_id: z.string().min(1, "device_id must not be empty"),
    ts: z.string().min(1).optional(),
    rssi: nullableNumber,
  })
  .strict();

export type HeartbeatPayload = z.infer<typeof HeartbeatPayloadSchema>;
