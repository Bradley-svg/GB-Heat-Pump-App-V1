import { z } from "zod";
import { numericParam } from "./params";

export const COMMISSIONING_STATUSES = ["draft", "in_progress", "blocked", "completed", "failed"] as const;

export const CommissioningStatusSchema = z.enum(COMMISSIONING_STATUSES);

export const CommissioningRunsQuerySchema = z
  .object({
    status: CommissioningStatusSchema.optional(),
    device: z.string().trim().min(1).optional(),
    profile: z.string().trim().min(1).optional(),
    limit: numericParam({ integer: true, min: 1, max: 200, defaultValue: 50 }),
    since: z.string().datetime({ offset: true }).optional(),
    until: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const CreateCommissioningRunSchema = z
  .object({
    run_id: z.string().trim().min(1).optional(),
    device_id: z.string().trim().min(1),
    profile_id: z.string().trim().min(1).optional(),
    status: CommissioningStatusSchema.default("draft"),
    started_at: z.string().datetime({ offset: true }).optional(),
    completed_at: z.string().datetime({ offset: true }).nullable().optional(),
    checklist: z.array(z.string().trim().min(1)).optional(),
    notes: z.string().trim().min(1).max(4000).optional(),
    performed_by: z.string().trim().min(1).optional(),
  })
  .strict();

export type CommissioningRunsQuery = z.infer<typeof CommissioningRunsQuerySchema>;
export type CreateCommissioningRunInput = z.infer<typeof CreateCommissioningRunSchema>;
