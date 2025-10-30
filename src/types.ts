export type Env = {
  DB: D1Database;
  APP_BASE_URL: string;
  RETURN_DEFAULT: string;
  TIMEZONE: string;
  CURSOR_SECRET: string;

  // Access secrets (set via `wrangler secret put`)
  ACCESS_AUD: string;
  ACCESS_JWKS_URL: string;
};

export type TelemetryBody = {
  ts: string;               // ISO
  device_id: string;
  metrics: {
    supplyC?: number;
    returnC?: number;
    tankC?: number;
    ambientC?: number;
    flowLps?: number;       // L/s (already converted at source)
    compCurrentA?: number;
    eevSteps?: number;
    powerKW?: number;
    mode?: string;
    defrost?: number;       // 0/1
  };
  faults?: string[];
  rssi?: number;
};

export type HeartbeatBody = {
  ts: string;               // ISO
  device_id: string;
  rssi?: number;
};

export type AccessUser = {
  email: string;
  roles: Array<"admin" | "client" | "contractor">;
  clientIds: string[]; // optional scoping
};
