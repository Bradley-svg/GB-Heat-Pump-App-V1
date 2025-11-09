import type { Device } from "@greenbro/sdk-core";

export const sampleDevices: Device[] = [
  {
    didPseudo: "a1B2c3D4e5F6g7H8i9J0",
    keyVersion: "v2",
    latest: {
      timestamp_minute: "2024-05-20T10:30:00.000Z",
      supplyC: 48.2,
      returnC: 41.7,
      flowLps: 15.4,
      powerKW: 12.1,
      COP: 4.1,
    },
  },
];

export const sampleAlerts = [
  {
    id: "alert-1",
    didPseudo: "a1B2c3D4e5F6g7H8i9J0",
    alert_type: "PRESSURE_LOW",
    severity: "MEDIUM",
    message: "Low return temperature detected",
    raised_at: "2024-05-20T10:31:00.000Z",
  },
];
