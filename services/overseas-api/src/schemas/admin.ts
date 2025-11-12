import { z } from "zod";
import { numericParam } from "./params";

export const AdminOverviewQuerySchema = z
  .object({
    limit: numericParam({ integer: true, min: 1, max: 100, defaultValue: 40 }),
  })
  .strict();

export type AdminOverviewQuery = z.infer<typeof AdminOverviewQuerySchema>;
