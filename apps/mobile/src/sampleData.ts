export const sampleDevice = {
  didPseudo: "a1B2c3D4e5F6g7H8i9J0",
  latest: {
    timestamp_minute: "2024-05-20T10:30:00.000Z",
    supplyC: 48.2,
    returnC: 41.7,
    COP: 4.1,
  },
};

export const sampleAlerts = [
  {
    id: "alert-1",
    didPseudo: sampleDevice.didPseudo,
    alert_type: "PRESSURE_LOW",
    severity: "MEDIUM" as const,
    message: "Low return temperature detected",
    raised_at: "2024-05-20T10:31:00.000Z",
  },
];
