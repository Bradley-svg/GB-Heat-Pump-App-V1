import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const bool = (defaultValue: boolean) =>
  z.preprocess((val) => {
    if (typeof val === "boolean") {
      return val;
    }
    if (typeof val === "string") {
      const normalized = val.toLowerCase();
      if (["1", "true", "yes", "on"].includes(normalized)) {
        return true;
      }
      if (["0", "false", "no", "off"].includes(normalized)) {
        return false;
      }
    }
    if (val === undefined || val === null) {
      return defaultValue;
    }
    return val;
  }, z.boolean());

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1024).max(65535).default(8080),
  DATABASE_URL: z.string().min(1),
  CN_GATEWAY_BASE: z.string().url(),
  KMS_PROVIDER: z.enum(["alibaba", "tencent", "huawei", "dev"]),
  KMS_KEY_ALIAS: z.string().min(3),
  KMS_KEY_VERSION: z.string().min(1),
  EXPORT_ENABLED: bool(true),
  APP_API_BASE: z.string().url(),
  EXPORT_SIGNING_KEY_PATH: z.string().min(1),
  EXPORT_BATCH_SIZE: z.coerce.number().int().min(1).max(2000).default(500),
  EXPORT_PROFILE_ID: z.string().min(1).default("cn-gateway"),
  EXPORT_FLUSH_INTERVAL_MS: z.coerce.number().int().min(200).max(60000).default(3000),
  RATE_LIMIT_RPM_DEVICE: z.coerce.number().int().min(1).max(3600).default(120),
  IDEMPOTENCY_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  TIMESTAMP_SKEW_SECS: z.coerce.number().int().min(30).max(600).default(120),
  REDIS_URL: z.string().url().optional(),
  LOG_LEVEL: z.string().default("info"),
  METRICS_ENABLED: bool(true),
  ADMIN_TOKEN: z.string().optional(),
  ADMIN_TOTP_SECRET: z.string().optional(),
  CF_ACCESS_CLIENT_ID: z.string().optional(),
  CF_ACCESS_CLIENT_SECRET: z.string().optional(),
  DEV_KMS_KEY: z.string().optional(),
  ALIBABA_REGION: z.string().optional(),
  ALIBABA_ACCESS_KEY_ID: z.string().optional(),
  ALIBABA_ACCESS_KEY_SECRET: z.string().optional(),
  TENCENT_REGION: z.string().optional(),
  TENCENT_SECRET_ID: z.string().optional(),
  TENCENT_SECRET_KEY: z.string().optional(),
  HUAWEI_REGION: z.string().optional(),
  HUAWEI_PROJECT_ID: z.string().optional(),
  HUAWEI_DOMAIN_ID: z.string().optional(),
  HUAWEI_ACCESS_KEY: z.string().optional(),
  HUAWEI_SECRET_KEY: z.string().optional()
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Configuration validation failed", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export type AppConfig = z.infer<typeof EnvSchema>;

export const config: AppConfig = parsed.data;

const safeSummary = {
  env: config.NODE_ENV,
  port: config.PORT,
  kmsProvider: config.KMS_PROVIDER,
  kmsKeyVersion: config.KMS_KEY_VERSION,
  exportEnabled: config.EXPORT_ENABLED,
  exportBatchSize: config.EXPORT_BATCH_SIZE,
  metricsEnabled: config.METRICS_ENABLED,
  hasRedis: Boolean(config.REDIS_URL)
};

console.warn("[cn-gateway] configuration loaded", safeSummary);
