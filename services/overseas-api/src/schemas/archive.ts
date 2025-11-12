import { z } from "zod";
import { numericParam } from "./params";

export const ArchiveQuerySchema = z
  .object({
    offlineHours: numericParam({ integer: true, min: 1, max: 720, defaultValue: 72 }),
    days: numericParam({ integer: true, min: 1, max: 30, defaultValue: 14 }),
  })
  .strict();

export type ArchiveQuery = z.infer<typeof ArchiveQuerySchema>;
