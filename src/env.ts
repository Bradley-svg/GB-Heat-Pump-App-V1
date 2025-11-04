import type { Queue } from "@cloudflare/workers-types";
import { z } from "zod";

export interface Env {
  DB: D1Database;
  ACCESS_JWKS_URL: string;
  ACCESS_AUD: string;
  APP_BASE_URL: string;
  RETURN_DEFAULT: string;
  DEV_ALLOW_USER?: string;
  ALLOW_DEV_ACCESS_SHIM?: string;
  APP_API_BASE?: string;
  APP_ASSET_BASE?: string;
  HEARTBEAT_INTERVAL_SECS?: string;
  OFFLINE_MULTIPLIER?: string;
  CURSOR_SECRET: string;
  APP_STATIC?: R2Bucket;
  GB_BUCKET?: R2Bucket;
  RETENTION_ARCHIVE?: R2Bucket;
  ASSET_SIGNING_SECRET?: string;
  ALLOWED_PREFIXES?: string;
  INGEST_ALLOWED_ORIGINS: string;
  INGEST_RATE_LIMIT_PER_MIN: string;
  INGEST_DEDUP_WINDOW_MINUTES?: string;
  INGEST_SIGNATURE_TOLERANCE_SECS: string;
  MQTT_WEBHOOK_QUEUE?: Queue;
  TELEMETRY_RETENTION_DAYS?: string;
  TELEMETRY_REFACTOR_MODE?: string;
  RETENTION_BACKUP_PREFIX?: string;
  RETENTION_BACKUP_BEFORE_DELETE?: string;
}

export type User = {
  email: string;
  roles: Array<"admin" | "client" | "contractor">;
  clientIds: string[];
};

export class EnvValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment configuration: ${issues.join("; ")}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

const HTTP_SCHEMES = new Set(["http:", "https:"]);
const ABSOLUTE_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const LOCAL_FLAG_VALUES = new Set(["1", "true", "yes", "on"]);

function isHttpUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    return HTTP_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

function isSafeRelativePath(candidate: string): boolean {
  return candidate.startsWith("/") && !candidate.startsWith("//");
}

const EnvSchema = z
  .object({
    ACCESS_JWKS_URL: z
      .string()
      .min(1, "ACCESS_JWKS_URL must be set")
      .refine((value) => isHttpUrl(value.trim()), {
        message: "ACCESS_JWKS_URL must be an http(s) URL",
      }),
    ACCESS_AUD: z
      .string()
      .trim()
      .min(1, "ACCESS_AUD must be set"),
    APP_BASE_URL: z
      .string()
      .min(1, "APP_BASE_URL must be set")
      .refine((value) => isHttpUrl(value.trim()), {
        message: "APP_BASE_URL must be an absolute http(s) URL",
      }),
    RETURN_DEFAULT: z.string().min(1, "RETURN_DEFAULT must be set"),
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

    const appBase = typeof value.APP_BASE_URL === "string" ? value.APP_BASE_URL.trim() : "";
    if (!appBase || !isHttpUrl(appBase)) {
      ctx.addIssue({
        path: ["APP_BASE_URL"],
        code: z.ZodIssueCode.custom,
        message: "APP_BASE_URL must be an absolute http(s) URL",
      });
    }

    const returnDefault = typeof value.RETURN_DEFAULT === "string" ? value.RETURN_DEFAULT.trim() : "";
    if (!returnDefault) {
      ctx.addIssue({
        path: ["RETURN_DEFAULT"],
        code: z.ZodIssueCode.custom,
        message: "RETURN_DEFAULT must be set",
      });
    } else if (!isSafeRelativePath(returnDefault) && !isHttpUrl(returnDefault)) {
      ctx.addIssue({
        path: ["RETURN_DEFAULT"],
        code: z.ZodIssueCode.custom,
        message: "RETURN_DEFAULT must be a safe relative path or an absolute http(s) URL",
      });
    }

    const appApiBase = typeof value.APP_API_BASE === "string" ? value.APP_API_BASE.trim() : "";
    if (appApiBase && ABSOLUTE_SCHEME_PATTERN.test(appApiBase) && !isHttpUrl(appApiBase)) {
      ctx.addIssue({
        path: ["APP_API_BASE"],
        code: z.ZodIssueCode.custom,
        message: "APP_API_BASE must use http(s) scheme when absolute",
      });
    }

    const appAssetBase = typeof value.APP_ASSET_BASE === "string" ? value.APP_ASSET_BASE.trim() : "";
    if (appAssetBase) {
      if (appAssetBase.startsWith("//")) {
        // protocol-relative URLs are acceptable
        // ensure host portion exists by attempting to parse with https:// prefix
        try {
          const parsed = new URL(`https:${appAssetBase}`);
          if (!parsed.host) {
            throw new Error("missing host");
          }
        } catch {
          ctx.addIssue({
            path: ["APP_ASSET_BASE"],
            code: z.ZodIssueCode.custom,
            message: "APP_ASSET_BASE protocol-relative URLs must include a host",
          });
        }
      } else if (ABSOLUTE_SCHEME_PATTERN.test(appAssetBase) && !isHttpUrl(appAssetBase)) {
        ctx.addIssue({
          path: ["APP_ASSET_BASE"],
          code: z.ZodIssueCode.custom,
          message: "APP_ASSET_BASE must use http(s) scheme when absolute",
        });
      }
    }

    const ingestOriginsRaw =
      typeof value.INGEST_ALLOWED_ORIGINS === "string" ? value.INGEST_ALLOWED_ORIGINS.trim() : "";
    const ingestRateLimitRaw =
      typeof value.INGEST_RATE_LIMIT_PER_MIN === "string"
        ? value.INGEST_RATE_LIMIT_PER_MIN.trim()
        : "";
    const ingestToleranceRaw =
      typeof value.INGEST_SIGNATURE_TOLERANCE_SECS === "string"
        ? value.INGEST_SIGNATURE_TOLERANCE_SECS.trim()
        : "";
    const normalizedAllowShim =
      typeof value.ALLOW_DEV_ACCESS_SHIM === "string"
        ? value.ALLOW_DEV_ACCESS_SHIM.trim().toLowerCase()
        : "";
    const allowShim =
      normalizedAllowShim.length > 0 && LOCAL_FLAG_VALUES.has(normalizedAllowShim);
    const hasDevUser =
      typeof value.DEV_ALLOW_USER === "string" && value.DEV_ALLOW_USER.trim().length > 0;
    const appBaseLower = appBase.toLowerCase();
    const appBaseIsLocal =
      appBaseLower.startsWith("http://localhost") ||
      appBaseLower.startsWith("http://127.0.0.1") ||
      appBaseLower.startsWith("http://0.0.0.0") ||
      appBaseLower.startsWith("http://[::1]");

    if (allowShim && !appBaseIsLocal) {
      ctx.addIssue({
        path: ["ALLOW_DEV_ACCESS_SHIM"],
        code: z.ZodIssueCode.custom,
        message:
          "ALLOW_DEV_ACCESS_SHIM may only be enabled when APP_BASE_URL points to a localhost origin",
      });
    }

    const isLocalEnv = hasDevUser || appBaseIsLocal;

    if (!ingestOriginsRaw) {
      if (isLocalEnv) {
        console.warn("INGEST_ALLOWED_ORIGINS is not set; ingest endpoints will deny browser origins.");
      } else {
        ctx.addIssue({
          path: ["INGEST_ALLOWED_ORIGINS"],
          code: z.ZodIssueCode.custom,
          message: "INGEST_ALLOWED_ORIGINS must be configured for non-local environments",
        });
      }
    }

    if (!ingestRateLimitRaw) {
      ctx.addIssue({
        path: ["INGEST_RATE_LIMIT_PER_MIN"],
        code: z.ZodIssueCode.custom,
        message: "INGEST_RATE_LIMIT_PER_MIN must be configured",
      });
    } else {
      const parsed = Number.parseInt(ingestRateLimitRaw, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        ctx.addIssue({
          path: ["INGEST_RATE_LIMIT_PER_MIN"],
          code: z.ZodIssueCode.custom,
          message: "INGEST_RATE_LIMIT_PER_MIN must be a positive integer",
        });
      }
    }

    if (!ingestToleranceRaw) {
      ctx.addIssue({
        path: ["INGEST_SIGNATURE_TOLERANCE_SECS"],
        code: z.ZodIssueCode.custom,
        message: "INGEST_SIGNATURE_TOLERANCE_SECS must be configured",
      });
    } else {
      const parsed = Number.parseInt(ingestToleranceRaw, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        ctx.addIssue({
          path: ["INGEST_SIGNATURE_TOLERANCE_SECS"],
          code: z.ZodIssueCode.custom,
          message: "INGEST_SIGNATURE_TOLERANCE_SECS must be zero or a positive integer",
        });
      }
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
