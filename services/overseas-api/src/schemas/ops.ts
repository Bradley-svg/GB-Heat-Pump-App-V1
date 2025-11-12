import { z } from "zod";
import { numericParam } from "./params";

export const OpsOverviewQuerySchema = z
  .object({
    limit: numericParam({ integer: true, min: 1, max: 200, defaultValue: 50 }),
  })
  .strict();

export type OpsOverviewQuery = z.infer<typeof OpsOverviewQuerySchema>;
