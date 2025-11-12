import { z } from "zod";
import { SAFE_METRICS } from "@greenbro/sdk-core/src/constants";

const numberMetric = z.number().finite();
const optionalNumber = numberMetric.optional();

const SAFE_METRIC_SHAPE: Record<(typeof SAFE_METRICS)[number], z.ZodTypeAny> = {
  supplyC: optionalNumber,
  returnC: optionalNumber,
  flowLps: optionalNumber,
  powerKW: optionalNumber,
  COP: optionalNumber,
  pressureHigh: optionalNumber,
  pressureLow: optionalNumber,
  status_code: z.string().regex(/^[A-Z0-9_:-]{1,32}$/).optional(),
  fault_code: z.string().regex(/^[A-Z0-9_:-]{0,32}$/).optional(),
  control_mode: z.enum(["AUTO", "MANUAL", "OFF", "SAFE"]).optional(),
  timestamp_minute: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/).optional(),
  energyKWh: optionalNumber,
  cycleCount: z.number().int().min(0).optional(),
  uptimeMinutes: z.number().int().min(0).optional()
};

export const ExportRecordSchema = z
  .object({
    didPseudo: z.string().min(8).max(44),
    seq: z.number().int().min(0),
    timestamp: z.string().datetime({ offset: true }),
    metrics: z.object(SAFE_METRIC_SHAPE).strict(),
    keyVersion: z.string().min(1).max(64)
  })
  .strict();

export type ExportRecord = z.infer<typeof ExportRecordSchema>;

export const ExportBatchSchema = z
  .object({
    batchId: z.string().min(8).max(128),
    count: z.number().int().min(1).max(2000),
    records: z.array(ExportRecordSchema).nonempty()
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.records.length !== payload.count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "count mismatch",
        path: ["count"]
      });
    }
  });

export type ExportBatch = z.infer<typeof ExportBatchSchema>;
