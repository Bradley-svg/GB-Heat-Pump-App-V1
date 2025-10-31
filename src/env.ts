import type { AccessUser as User } from "./types";

export interface Env {
  DB: D1Database;
  ACCESS_JWKS_URL: string;
  ACCESS_AUD: string;
  APP_BASE_URL: string;
  RETURN_DEFAULT: string;
  HEARTBEAT_INTERVAL_SECS?: string;
  OFFLINE_MULTIPLIER?: string;
  CURSOR_SECRET: string;
}

export type { User };
