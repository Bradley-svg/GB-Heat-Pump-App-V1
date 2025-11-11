import type { DashboardSnapshot } from "@greenbro/sdk-rn";

export const sampleSnapshot: DashboardSnapshot = {
  generated_at: "2025-11-11T10:00:00.000Z",
  scope: "tenant",
  window_start_ms: Date.now() - 60 * 60 * 1000,
  kpis: {
    devices_total: 5,
    devices_online: 5,
    offline_count: 0,
    online_pct: 100,
    avg_cop: 4.0,
    low_deltaT_count: 0,
    open_alerts: 0,
    max_heartbeat_age_sec: 30,
  },
  alerts: [],
  top_devices: [
    {
      device_id: "***42",
      lookup: "enc.sample-42",
      site: "Sample Estate",
      online: true,
      last_seen_at: "2025-11-11T09:58:00.000Z",
      updated_at: "2025-11-11T09:58:05.000Z",
      supplyC: 47.8,
      returnC: 41.2,
      cop: 4.1,
      deltaT: 6.6,
      thermalKW: 12.3,
      alert_count: 0,
    },
  ],
  trend: [],
};
