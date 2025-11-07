import { z } from "zod";

export interface KvNamespace {
  get(key: string, options?: { type: "text" | "json" | "arrayBuffer" }): Promise<any>;
  put(
    key: string,
    value: string,
    options?: { expiration?: number; expirationTtl?: number; metadata?: unknown },
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  DB: D1Database;
  ACCESS_JWKS_URL: string;
  ACCESS_AUD: string;
  APP_BASE_URL: string;
  RETURN_DEFAULT: string;
  ENVIRONMENT?: string;
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
  INGEST_FAILURE_LIMIT_PER_MIN?: string;
  INGEST_IP_LIMIT_PER_MIN?: string;
  INGEST_IP_BLOCK_SECONDS?: string;
  INGEST_IP_BUCKETS?: KvNamespace;
  AUTH_IP_LIMIT_PER_MIN?: string;
  AUTH_IP_BLOCK_SECONDS?: string;
  AUTH_IP_BUCKETS?: KvNamespace;
  TELEMETRY_RETENTION_DAYS?: string;
  TELEMETRY_REFACTOR_MODE?: string;
  RETENTION_BACKUP_PREFIX?: string;
  RETENTION_BACKUP_BEFORE_DELETE?: string;
  LOG_LEVEL?: string;
  LOG_DEBUG_SAMPLE_RATE?: string;
  LOG_REDACT_CLIENT_IP?: string;
  LOG_REDACT_USER_AGENT?: string;
  LOG_REDACT_CF_RAY?: string;
  OBSERVABILITY_MAX_BYTES?: string;
  TELEMETRY_CARRY_MAX_MINUTES?: string;
  CLIENT_COMPACT_CACHE_TTL_SECS?: string;
  CLIENT_QUERY_PROFILE?: string;
  CLIENT_QUERY_PROFILE_THRESHOLD_MS?: string;
  ARCHIVE_CACHE_TTL_SECS?: string;
  PASSWORD_PBKDF2_ITERATIONS?: string;
  PASSWORD_RESET_WEBHOOK_URL?: string;
  PASSWORD_RESET_WEBHOOK_SECRET?: string;
  EMAIL_VERIFICATION_WEBHOOK_URL?: string;
  EMAIL_VERIFICATION_WEBHOOK_SECRET?: string;
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS?: string;
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
const DEV_SHIM_ENVIRONMENTS = new Set(["development", "dev", "local"]);

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
      .refine((value: string) => isHttpUrl(value.trim()), {
        message: "ACCESS_JWKS_URL must be an http(s) URL",
      }),
    ACCESS_AUD: z
      .string()
      .trim()
      .min(1, "ACCESS_AUD must be set"),
    APP_BASE_URL: z
      .string()
      .min(1, "APP_BASE_URL must be set")
      .refine((value: string) => isHttpUrl(value.trim()), {
        message: "APP_BASE_URL must be an absolute http(s) URL",
      }),
    RETURN_DEFAULT: z.string().min(1, "RETURN_DEFAULT must be set"),
    CURSOR_SECRET: z
      .string()
      .trim()
      .min(16, "CURSOR_SECRET must be at least 16 characters long"),
  })
  .passthrough()
  .superRefine((value: Record<string, unknown>, ctx: z.RefinementCtx) => {
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
    const ingestFailureLimitRaw =
      typeof value.INGEST_FAILURE_LIMIT_PER_MIN === "string"
        ? value.INGEST_FAILURE_LIMIT_PER_MIN.trim()
        : "";
    const ingestToleranceRaw =
      typeof value.INGEST_SIGNATURE_TOLERANCE_SECS === "string"
        ? value.INGEST_SIGNATURE_TOLERANCE_SECS.trim()
        : "";
    const ingestIpLimitRaw =
      typeof value.INGEST_IP_LIMIT_PER_MIN === "string"
        ? value.INGEST_IP_LIMIT_PER_MIN.trim()
        : "";
    const ingestIpBlockRaw =
      typeof value.INGEST_IP_BLOCK_SECONDS === "string"
        ? value.INGEST_IP_BLOCK_SECONDS.trim()
        : "";
    const normalizedAllowShim =
      typeof value.ALLOW_DEV_ACCESS_SHIM === "string"
        ? value.ALLOW_DEV_ACCESS_SHIM.trim().toLowerCase()
        : "";
    const allowShimFlag =
      normalizedAllowShim.length > 0 && LOCAL_FLAG_VALUES.has(normalizedAllowShim);
    const hasDevUser =
      typeof value.DEV_ALLOW_USER === "string" && value.DEV_ALLOW_USER.trim().length > 0;
    const rawEnvironment =
      typeof value.ENVIRONMENT === "string" ? value.ENVIRONMENT.trim().toLowerCase() : "";
    const environmentAllowsShim =
      rawEnvironment.length > 0 && DEV_SHIM_ENVIRONMENTS.has(rawEnvironment);
    const appBaseLower = appBase.toLowerCase();
    const appBaseIsLocal =
      appBaseLower.startsWith("http://localhost") ||
      appBaseLower.startsWith("http://127.0.0.1") ||
      appBaseLower.startsWith("http://0.0.0.0") ||
      appBaseLower.startsWith("http://[::1]");

    if (allowShimFlag && !environmentAllowsShim) {
      ctx.addIssue({
        path: ["ALLOW_DEV_ACCESS_SHIM"],
        code: z.ZodIssueCode.custom,
        message: "ALLOW_DEV_ACCESS_SHIM requires ENVIRONMENT to be one of development, dev, local, test",
      });
    }

    if (allowShimFlag && !appBaseIsLocal) {
      ctx.addIssue({
        path: ["ALLOW_DEV_ACCESS_SHIM"],
        code: z.ZodIssueCode.custom,
        message:
          "ALLOW_DEV_ACCESS_SHIM may only be enabled when APP_BASE_URL points to a localhost origin",
      });
    }

    const isLocalEnv = hasDevUser || appBaseIsLocal || environmentAllowsShim;

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

    if (ingestIpLimitRaw) {
      const parsed = Number.parseInt(ingestIpLimitRaw, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        ctx.addIssue({
          path: ["INGEST_IP_LIMIT_PER_MIN"],
          code: z.ZodIssueCode.custom,
          message: "INGEST_IP_LIMIT_PER_MIN must be zero or a positive integer when set",
        });
      }
      if (parsed > 0 && ingestIpBlockRaw) {
        const block = Number.parseInt(ingestIpBlockRaw, 10);
        if (!Number.isFinite(block) || block <= 0) {
          ctx.addIssue({
            path: ["INGEST_IP_BLOCK_SECONDS"],
            code: z.ZodIssueCode.custom,
            message: "INGEST_IP_BLOCK_SECONDS must be a positive integer when set",
          });
        }
      }
      if (parsed > 0 && !value.INGEST_IP_BUCKETS) {
        if (isLocalEnv) {
          console.warn(
            "INGEST_IP_LIMIT_PER_MIN is enabled without an INGEST_IP_BUCKETS binding; falling back to in-memory token buckets per isolate.",
          );
        } else {
          ctx.addIssue({
            path: ["INGEST_IP_BUCKETS"],
            code: z.ZodIssueCode.custom,
            message: "INGEST_IP_BUCKETS must be bound when INGEST_IP_LIMIT_PER_MIN is greater than zero",
          });
        }
      }
    } else if (ingestIpBlockRaw) {
      const block = Number.parseInt(ingestIpBlockRaw, 10);
      if (!Number.isFinite(block) || block <= 0) {
        ctx.addIssue({
          path: ["INGEST_IP_BLOCK_SECONDS"],
          code: z.ZodIssueCode.custom,
          message: "INGEST_IP_BLOCK_SECONDS must be a positive integer when set",
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

    if (ingestFailureLimitRaw) {
      const parsed = Number.parseInt(ingestFailureLimitRaw, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        ctx.addIssue({
          path: ["INGEST_FAILURE_LIMIT_PER_MIN"],
          code: z.ZodIssueCode.custom,
          message: "INGEST_FAILURE_LIMIT_PER_MIN must be a non-negative integer",
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

    const logLevelRaw = typeof value.LOG_LEVEL === "string" ? value.LOG_LEVEL.trim().toLowerCase() : "";
    if (logLevelRaw && !["debug", "info", "warn", "error"].includes(logLevelRaw)) {
      ctx.addIssue({
        path: ["LOG_LEVEL"],
        code: z.ZodIssueCode.custom,
        message: "LOG_LEVEL must be one of debug, info, warn, error",
      });
    }

    const logSampleRaw =
      typeof value.LOG_DEBUG_SAMPLE_RATE === "string" ? value.LOG_DEBUG_SAMPLE_RATE.trim() : "";
    if (logSampleRaw) {
      const parsed = Number(logSampleRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        ctx.addIssue({
          path: ["LOG_DEBUG_SAMPLE_RATE"],
          code: z.ZodIssueCode.custom,
          message: "LOG_DEBUG_SAMPLE_RATE must be a positive number",
        });
      }
    }

    const observabilityMaxRaw =
      typeof value.OBSERVABILITY_MAX_BYTES === "string" ? value.OBSERVABILITY_MAX_BYTES.trim() : "";
    if (observabilityMaxRaw) {
      const parsed = Number(observabilityMaxRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        ctx.addIssue({
          path: ["OBSERVABILITY_MAX_BYTES"],
          code: z.ZodIssueCode.custom,
          message: "OBSERVABILITY_MAX_BYTES must be a positive integer",
        });
      }
    }

    const passwordIterationsRaw =
      typeof value.PASSWORD_PBKDF2_ITERATIONS === "string"
        ? value.PASSWORD_PBKDF2_ITERATIONS.trim()
        : "";
    if (passwordIterationsRaw) {
      const parsed = Number.parseInt(passwordIterationsRaw, 10);
      if (!Number.isFinite(parsed) || parsed < 50000 || parsed > 500000) {
        ctx.addIssue({
          path: ["PASSWORD_PBKDF2_ITERATIONS"],
          code: z.ZodIssueCode.custom,
          message: "PASSWORD_PBKDF2_ITERATIONS must be between 50000 and 500000 when set",
        });
      }
    }

    const resetWebhookRaw =
      typeof value.PASSWORD_RESET_WEBHOOK_URL === "string"
        ? value.PASSWORD_RESET_WEBHOOK_URL.trim()
        : "";
    if (resetWebhookRaw && !isHttpUrl(resetWebhookRaw)) {
      ctx.addIssue({
        path: ["PASSWORD_RESET_WEBHOOK_URL"],
        code: z.ZodIssueCode.custom,
        message: "PASSWORD_RESET_WEBHOOK_URL must be an absolute http(s) URL when set",
      });
    }

    const resetWebhookSecretRaw =
      typeof value.PASSWORD_RESET_WEBHOOK_SECRET === "string"
        ? value.PASSWORD_RESET_WEBHOOK_SECRET.trim()
        : "";
    if (resetWebhookSecretRaw && resetWebhookSecretRaw.length < 16) {
      ctx.addIssue({
        path: ["PASSWORD_RESET_WEBHOOK_SECRET"],
        code: z.ZodIssueCode.custom,
        message: "PASSWORD_RESET_WEBHOOK_SECRET must be at least 16 characters when set",
      });
    }

    const verificationWebhookRaw =
      typeof value.EMAIL_VERIFICATION_WEBHOOK_URL === "string"
        ? value.EMAIL_VERIFICATION_WEBHOOK_URL.trim()
        : "";
    if (verificationWebhookRaw && !isHttpUrl(verificationWebhookRaw)) {
      ctx.addIssue({
        path: ["EMAIL_VERIFICATION_WEBHOOK_URL"],
        code: z.ZodIssueCode.custom,
        message: "EMAIL_VERIFICATION_WEBHOOK_URL must be an absolute http(s) URL when set",
      });
    }

    const verificationWebhookSecretRaw =
      typeof value.EMAIL_VERIFICATION_WEBHOOK_SECRET === "string"
        ? value.EMAIL_VERIFICATION_WEBHOOK_SECRET.trim()
        : "";
    if (verificationWebhookSecretRaw && verificationWebhookSecretRaw.length < 16) {
      ctx.addIssue({
        path: ["EMAIL_VERIFICATION_WEBHOOK_SECRET"],
        code: z.ZodIssueCode.custom,
        message: "EMAIL_VERIFICATION_WEBHOOK_SECRET must be at least 16 characters when set",
      });
    }

    const resendCooldownRaw =
      typeof value.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS === "string" ?
        value.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS.trim() :
        "";
    if (resendCooldownRaw) {
      const parsed = Number.parseInt(resendCooldownRaw, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        ctx.addIssue({
          path: ["EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS"],
          code: z.ZodIssueCode.custom,
          message: "EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS must be a positive integer when set",
        });
      }
    }

    const carryForwardRaw =
      typeof value.TELEMETRY_CARRY_MAX_MINUTES === "string"
        ? value.TELEMETRY_CARRY_MAX_MINUTES.trim()
        : "";
    if (carryForwardRaw) {
      const parsed = Number.parseInt(carryForwardRaw, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        ctx.addIssue({
          path: ["TELEMETRY_CARRY_MAX_MINUTES"],
          code: z.ZodIssueCode.custom,
          message: "TELEMETRY_CARRY_MAX_MINUTES must be a positive integer",
        });
      }
    }

    const authIpLimitRaw =
      typeof value.AUTH_IP_LIMIT_PER_MIN === "string" ? value.AUTH_IP_LIMIT_PER_MIN.trim() : "";
    if (authIpLimitRaw) {
      const parsed = Number.parseInt(authIpLimitRaw, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        ctx.addIssue({
          path: ["AUTH_IP_LIMIT_PER_MIN"],
          code: z.ZodIssueCode.custom,
          message: "AUTH_IP_LIMIT_PER_MIN must be zero or a positive integer",
        });
      }
    }

    const authIpBlockRaw =
      typeof value.AUTH_IP_BLOCK_SECONDS === "string" ? value.AUTH_IP_BLOCK_SECONDS.trim() : "";
    if (authIpBlockRaw) {
      const parsed = Number.parseInt(authIpBlockRaw, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        ctx.addIssue({
          path: ["AUTH_IP_BLOCK_SECONDS"],
          code: z.ZodIssueCode.custom,
          message: "AUTH_IP_BLOCK_SECONDS must be a positive integer",
        });
      }
    }

    const authLimit = Number.parseInt(authIpLimitRaw || "0", 10);
    if (authLimit > 0) {
      const bucket = value.AUTH_IP_BUCKETS as KvNamespace | undefined;
      if (!bucket || typeof bucket.get !== "function" || typeof bucket.put !== "function") {
        if (isLocalEnv) {
          console.warn(
            "AUTH_IP_LIMIT_PER_MIN is enabled without an AUTH_IP_BUCKETS binding; falling back to in-memory token buckets per isolate.",
          );
        } else {
          ctx.addIssue({
            path: ["AUTH_IP_BUCKETS"],
            code: z.ZodIssueCode.custom,
            message: "AUTH_IP_BUCKETS KV namespace must be bound when AUTH_IP_LIMIT_PER_MIN is greater than zero",
          });
        }
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
    const issues = result.error.issues.map((issue: z.ZodIssue) => {
      const path = issue.path.length ? issue.path.join(".") : "env";
      return `${path}: ${issue.message}`;
    });
    throw new EnvValidationError(issues);
  }

  validatedEnvs.add(env as unknown as object);
  return env;
}
