import { z } from "zod";
import { numericParam } from "./params";

export const AuditTrailQuerySchema = z
  .object({
    entity_type: z.string().trim().min(1).optional(),
    entity_id: z.string().trim().min(1).optional(),
    actor_id: z.string().trim().min(1).optional(),
    action: z.string().trim().min(1).optional(),
    limit: numericParam({ integer: true, min: 1, max: 200, defaultValue: 100 }),
    since: z.string().datetime({ offset: true }).optional(),
    until: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const CreateAuditEntrySchema = z
  .object({
    audit_id: z.string().trim().min(1).optional(),
    actor_id: z.string().trim().min(1).optional(),
    actor_email: z.string().trim().email().optional(),
    actor_name: z.string().trim().min(1).optional(),
    action: z.string().trim().min(1),
    entity_type: z.string().trim().min(1).optional(),
    entity_id: z.string().trim().min(1).optional(),
    metadata: z.record(z.any()).optional(),
    ip_address: z.string().trim().min(1).optional(),
    created_at: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export type AuditTrailQuery = z.infer<typeof AuditTrailQuerySchema>;
export type CreateAuditEntryInput = z.infer<typeof CreateAuditEntrySchema>;
