import { z } from "zod";
import type { AccessUser as User } from "./types";

export interface Env {
  DB: D1Database;
  ACCESS_JWKS_URL: string;
  ACCESS_AUD: string;
  APP_BASE_URL: string;
  RETURN_DEFAULT: string;
  APP_API_BASE?: string;
  APP_ASSET_BASE?: string;
  HEARTBEAT_INTERVAL_SECS?: string;
  OFFLINE_MULTIPLIER?: string;
  CURSOR_SECRET: string;
  APP_STATIC?: R2Bucket;
  INGEST_ALLOWED_ORIGINS?: string;
  INGEST_RATE_LIMIT_PER_MIN?: string;
  INGEST_SIGNATURE_TOLERANCE_SECS?: string;
}

export type { User };

export class EnvValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment configuration: ${issues.join("; ")}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

const EnvSchema = z
  .object({
    ACCESS_JWKS_URL: z
      .string()
      .trim()
      .url({ message: "ACCESS_JWKS_URL must be a valid URL" }),
    ACCESS_AUD: z
      .string()
      .trim()
      .min(1, "ACCESS_AUD must be set"),
    CURSOR_SECRET: z
      .string()
      .trim()
      .min(16, "CURSOR_SECRET must be at least 16 characters long"),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    const binding = value.DB as unknown;
    if (
      !binding ||
      typeof binding !== "object" ||
      typeof (binding as { prepare?: unknown }).prepare !== "function"
    ) {
      ctx.addIssue({
        path: ["DB"],
        code: z.ZodIssueCode.custom,
        message: "DB binding must be configured with a D1 database",
      });
    }
  });

const validatedEnvs = new WeakSet<object>();

export function validateEnv(env: Env): Env {
  if (validatedEnvs.has(env as unknown as object)) {
    return env;
  }

  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "env";
      return `${path}: ${issue.message}`;
    });
    throw new EnvValidationError(issues);
  }

  validatedEnvs.add(env as unknown as object);
  return env;
}
