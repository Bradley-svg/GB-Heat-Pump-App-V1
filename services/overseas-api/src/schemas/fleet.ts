import { z } from "zod";
import { numericParam } from "./params";

export const FleetSummaryQuerySchema = z
  .object({
    hours: numericParam({ integer: true, min: 1, max: 168, defaultValue: 24 }),
    lowDeltaT: numericParam({ min: 0, defaultValue: 2 }),
  })
  .strict();

export type FleetSummaryQuery = z.infer<typeof FleetSummaryQuerySchema>;
