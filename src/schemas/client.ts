import { z } from "zod";
import { numericParam } from "./params";

export const ClientCompactQuerySchema = z
  .object({
    hours: numericParam({ integer: true, min: 1, max: 72, defaultValue: 24 }),
    lowDeltaT: numericParam({ min: 0, defaultValue: 2 }),
  })
  .strict();

export type ClientCompactQuery = z.infer<typeof ClientCompactQuerySchema>;
