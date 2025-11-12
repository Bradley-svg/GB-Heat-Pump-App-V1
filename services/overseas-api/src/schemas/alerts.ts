import { z } from "zod";
import { numericParam } from "./params";

export const ALERT_SEVERITIES = ["info", "warning", "critical"] as const;
export const ALERT_STATUSES = ["open", "acknowledged", "resolved"] as const;
export const ALERT_ACTIONS = ["acknowledge", "assign", "resolve"] as const;

export const AlertSeveritySchema = z.enum(ALERT_SEVERITIES);
export const AlertStatusSchema = z.enum(ALERT_STATUSES);
export const AlertActionSchema = z.enum(ALERT_ACTIONS);

export const AlertsQuerySchema = z
  .object({
    limit: numericParam({ integer: true, min: 1, max: 100, defaultValue: 40 }),
    hours: numericParam({ integer: true, min: 1, max: 168, defaultValue: 72 }),
  })
  .strict();

export const AlertListQuerySchema = z
  .object({
    status: AlertStatusSchema.optional(),
    severity: AlertSeveritySchema.optional(),
    device: z.string().trim().min(1).optional(),
    profile: z.string().trim().min(1).optional(),
    limit: numericParam({ integer: true, min: 1, max: 200, defaultValue: 50 }),
    since: z.string().datetime({ offset: true }).optional(),
    until: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const CreateAlertSchema = z
  .object({
    alert_id: z.string().trim().min(1).optional(),
    device_id: z.string().trim().min(1),
    profile_id: z.string().trim().min(1).optional(),
    alert_type: z.string().trim().min(1),
    severity: AlertSeveritySchema.default("info"),
    status: AlertStatusSchema.default("open"),
    summary: z.string().trim().min(1).max(240).optional(),
    description: z.string().trim().min(1).max(4000).optional(),
    metadata: z.record(z.any()).optional(),
    acknowledged_at: z.string().datetime({ offset: true }).optional(),
    resolved_at: z.string().datetime({ offset: true }).nullable().optional(),
    resolved_by: z.string().trim().min(1).optional(),
    assigned_to: z.string().trim().min(1).optional(),
  })
  .strict();

const CommentSchema = z
  .string()
  .trim()
  .min(1, "Comment must not be empty")
  .max(2000, "Comment must be 2000 characters or fewer");

const AssigneeSchema = z.string().trim().min(1).max(200);

export const AlertLifecycleActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("acknowledge"),
      comment: CommentSchema.optional(),
      assignee: AssigneeSchema.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("assign"),
      assignee: AssigneeSchema,
      comment: CommentSchema.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("resolve"),
      comment: CommentSchema.optional(),
    })
    .strict(),
]);

export const AlertCommentCreateSchema = z
  .object({
    comment: CommentSchema,
  })
  .strict();

export type AlertsQuery = z.infer<typeof AlertsQuerySchema>;
export type AlertListQuery = z.infer<typeof AlertListQuerySchema>;
export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;
export type AlertLifecycleActionInput = z.infer<typeof AlertLifecycleActionSchema>;
export type AlertCommentCreateInput = z.infer<typeof AlertCommentCreateSchema>;
