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
