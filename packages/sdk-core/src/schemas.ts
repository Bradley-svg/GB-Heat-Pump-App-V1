import { z } from "zod";

const telemetryMetricsShape = {
  supplyC: z.number().min(-50).max(150),
  returnC: z.number().min(-50).max(150),
  flowLps: z.number().min(0).max(500).optional(),
  powerKW: z.number().min(0).max(500).optional(),
  COP: z.number().min(0).max(15).optional(),
  pressureHigh: z.number().min(0).max(1000).optional(),
  pressureLow: z.number().min(0).max(1000).optional(),
  status_code: z.string().regex(/^[A-Z0-9_]{1,16}$/).optional(),
  fault_code: z.string().regex(/^[A-Z0-9_]{1,16}$/).optional(),
  control_mode: z.enum(["AUTO", "MANUAL", "OFF", "SAFE"]).optional(),
  firmware_version_major_minor: z.string().regex(/^\d+\.\d+$/).optional(),
  alerts: z.array(z.string()).max(20).optional(),
  timestamp_minute: z.string().datetime(),
  energyKWh: z.number().min(0).optional(),
  cycleCount: z.number().int().min(0).optional(),
  uptimeMinutes: z.number().int().min(0).optional(),
} satisfies Record<string, z.ZodTypeAny>;

export const telemetryMetricsSchema = z.object(telemetryMetricsShape).strict();
export type TelemetryMetrics = z.infer<typeof telemetryMetricsSchema>;

export const ingestPayloadSchema = z
  .object({
    deviceId: z.string().min(1).max(128),
    seq: z.number().int().nonnegative(),
    timestamp: z.string().datetime(),
    metrics: z
      .object({
        supplyC: z.number(),
        returnC: z.number(),
        flowLps: z.number().optional(),
        powerKW: z.number().optional(),
        COP: z.number().optional(),
        pressureHigh: z.number().optional(),
        pressureLow: z.number().optional(),
        status_code: z.string().optional(),
        fault_code: z.string().optional(),
        control_mode: z.enum(["AUTO", "MANUAL", "OFF", "SAFE"]).optional(),
        energyKWh: z.number().optional(),
        cycleCount: z.number().optional(),
        uptimeMinutes: z.number().optional(),
      })
      .strict(),
  })
  .strict();

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;

export const pseudonymizedRecordSchema = z
  .object({
    didPseudo: z.string().min(8).max(44),
    keyVersion: z.string(),
    timestamp: z.string().datetime(),
    metrics: telemetryMetricsSchema,
  })
  .strict();

export type PseudonymizedRecord = z.infer<typeof pseudonymizedRecordSchema>;

export const deviceSchema = z
  .object({
    didPseudo: z.string(),
    keyVersion: z.string(),
    latest: telemetryMetricsSchema.optional(),
  })
  .strict();

export type Device = z.infer<typeof deviceSchema>;
