export type Env = {
  GREENBRO_DB: ;
  ACCESS_AUD: string;
  ACCESS_JWKS_URL: string;
  DEV_MODE?: string;
};

export type Role = "admin" | "client" | "contractor";

export type AccessUser = {
  email: string;
  roles: Role[];
  clientIds: string[];
};

export type TelemetryBody = {
  deviceId: string;
  ts?: string;
  metrics?: {
    supplyC?: number;
    returnC?: number;
    tankC?: number;
    ambientC?: number;
    flowLps?: number;
    compCurrentA?: number;
    eevSteps?: number;
    powerKW?: number;
    mode?: string;
    defrost?: number;
  };
  status?: Record<string, unknown>;
  faults?: Record<string, unknown>;
};

export type HeartbeatBody = {
  deviceId: string;
  rssi?: number;
};
