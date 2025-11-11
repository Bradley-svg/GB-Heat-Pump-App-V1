import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import telemetrySchema from "./telemetry.schema.json" assert { type: "json" };

export interface TelemetryMetrics {
  supplyC?: number;
  returnC?: number;
  flowLps?: number;
  powerKW?: number;
  COP?: number;
  pressureHigh?: number;
  pressureLow?: number;
  status_code?: string;
  fault_code?: string;
  control_mode?: "AUTO" | "MANUAL" | "OFF" | "SAFE";
  energyKWh?: number;
  cycleCount?: number;
  uptimeMinutes?: number;
  timestamp_minute?: string;
}

export interface TelemetryPayload {
  deviceId: string;
  seq: number;
  timestamp: string;
  metrics: TelemetryMetrics;
}

const ajv = new Ajv2020({
  strict: true,
  allErrors: true,
  removeAdditional: false
});

addFormats(ajv, ["date-time"]);

export const validateTelemetry = ajv.compile<TelemetryPayload>(telemetrySchema);
