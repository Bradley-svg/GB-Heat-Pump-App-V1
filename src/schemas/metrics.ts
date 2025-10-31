import { z } from "zod";

export const MetricsQuerySchema = z
  .object({
    format: z.preprocess(
      (input: unknown) => {
        if (input === undefined || input === null) return undefined;
        if (typeof input !== "string") return input;
        const trimmed = input.trim().toLowerCase();
        return trimmed === "" ? undefined : trimmed;
      },
      z.enum(["json", "prom"]).optional(),
    ),
  })
  .strict();

export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;
