import { describe, expect, it } from "vitest";
import { ModeAWebClient } from "./client";

const snapshotResponse = {
  generated_at: "2025-11-11T10:00:00.000Z",
  scope: "tenant",
  window_start_ms: Date.now() - 60_000,
  kpis: {
    devices_total: 2,
    devices_online: 2,
    offline_count: 0,
    online_pct: 100,
    avg_cop: 4.1,
    low_deltaT_count: 0,
    open_alerts: 1,
    max_heartbeat_age_sec: 30,
  },
  alerts: [
    {
      device_id: "***123",
      lookup: "enc.token",
      site: "Site A",
      ts: "2025-11-11T09:58:00.000Z",
      updated_at: "2025-11-11T09:58:10.000Z",
      faults: ["LOW_PRESSURE"],
      fault_count: 1,
    },
  ],
  top_devices: [
    {
      device_id: "***123",
      lookup: "enc.token",
      site: "Site A",
      online: true,
      last_seen_at: "2025-11-11T09:59:00.000Z",
      updated_at: "2025-11-11T09:59:05.000Z",
      supplyC: 48.2,
      returnC: 41.7,
      cop: 4.2,
      deltaT: 6.5,
      thermalKW: 12.5,
      alert_count: 0,
    },
  ],
  trend: [
    {
      label: "09:50",
      cop: 4.0,
      thermalKW: 12.1,
      deltaT: 6.1,
    },
  ],
};

describe("ModeAWebClient", () => {
  it("parses dashboard snapshot responses", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify(snapshotResponse), { status: 200 });
    const client = new ModeAWebClient({ apiBase: "https://example.com/api" }, fetchMock);
    const snapshot = await client.getDashboardSnapshot();
    expect(snapshot.kpis.devices_total).toBe(2);
    expect(snapshot.alerts[0]?.faults[0]).toBe("LOW_PRESSURE");
  });

  it("throws on non-200 responses", async () => {
    const fetchMock: typeof fetch = async () => new Response("nope", { status: 500 });
    const client = new ModeAWebClient({ apiBase: "https://example.com/api" }, fetchMock);
    await expect(client.getDashboardSnapshot()).rejects.toThrow(/500/);
  });
});
