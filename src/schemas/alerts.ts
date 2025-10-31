import { z } from "zod";
import { numericParam } from "./params";

export const AlertsQuerySchema = z
  .object({
    limit: numericParam({ integer: true, min: 1, max: 100, defaultValue: 40 }),
    hours: numericParam({ integer: true, min: 1, max: 168, defaultValue: 72 }),
  })
  .strict();

export type AlertsQuery = z.infer<typeof AlertsQuerySchema>;
