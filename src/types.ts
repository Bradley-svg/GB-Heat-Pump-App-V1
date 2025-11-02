export type { Env, User, User as AccessUser } from "./env";

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
