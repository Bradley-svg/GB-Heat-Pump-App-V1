import { z } from "zod";

import {
  numericParam,
  optionalBooleanFlag,
  optionalTrimmedString,
} from "./params";

const DEVICE_ID_LIMIT = 200;

export const TelemetryLatestBatchSchema = z
  .object({
    devices: z
      .array(
        z
          .string({
            required_error: "Device identifiers are required",
            invalid_type_error: "Device identifiers must be strings",
          })
          .trim()
          .min(1, "Device identifier must not be empty"),
      )
      .max(DEVICE_ID_LIMIT, `Cannot request more than ${DEVICE_ID_LIMIT} devices`)
      .default([]),
    include: z
      .object({
        faults: optionalBooleanFlag.default(true),
        metrics: optionalBooleanFlag.default(true),
      })
      .default({
        faults: true,
        metrics: true,
      }),
  })
  .strict();

export type TelemetryLatestBatchInput = z.infer<typeof TelemetryLatestBatchSchema>;

export const TelemetrySeriesQuerySchema = z
  .object({
    scope: optionalTrimmedString
      .transform((value: string | undefined) =>
        value ? value.toLowerCase() : undefined,
      )
      .refine(
        (value: string | undefined) =>
          !value || ["device", "profile", "fleet"].includes(value),
        "Invalid scope",
      )
      .default("device"),
    device: optionalTrimmedString,
    profile: optionalTrimmedString,
    metric: optionalTrimmedString,
    start: optionalTrimmedString,
    end: optionalTrimmedString,
    interval: optionalTrimmedString,
    fill: optionalTrimmedString,
    limit: numericParam({ integer: true, min: 1, max: 2000, defaultValue: 288 }),
  })
  .strict();

export type TelemetrySeriesQuery = z.infer<typeof TelemetrySeriesQuerySchema>;

export const TELEMETRY_ALLOWED_METRICS = [
  "thermalKW",
  "cop",
  "deltaT",
  "supplyC",
  "returnC",
  "flowLps",
  "powerKW",
] as const;

export const TELEMETRY_INTERVALS_MS: Record<string, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "1d": 86_400_000,
};
