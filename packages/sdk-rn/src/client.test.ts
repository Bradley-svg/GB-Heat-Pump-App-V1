import { describe, expect, it, vi } from "vitest";
import { ModeARNClient } from "./client";

const snapshotResponse = {
  generated_at: "2025-11-11T10:00:00.000Z",
  scope: "tenant",
  window_start_ms: Date.now() - 30_000,
  kpis: {
    devices_total: 4,
    devices_online: 3,
    offline_count: 1,
    online_pct: 75,
    avg_cop: 3.7,
    low_deltaT_count: 0,
    open_alerts: 1,
    max_heartbeat_age_sec: 60,
  },
  alerts: [],
  top_devices: [],
  trend: [],
};

describe("ModeARNClient", () => {
  it("persists snapshot to storage", async () => {
    const storage = {
      setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
    };
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify(snapshotResponse), { status: 200 });
    const client = new ModeARNClient({
      apiBase: "https://example.com/api",
      storage,
      fetchImpl: fetchMock,
    });
    const snapshot = await client.getDashboardSnapshot();
    expect(snapshot.kpis.devices_total).toBe(4);
    expect(storage.setItem).toHaveBeenCalledWith("modea:snapshot", expect.any(String));
  });

  it("throws on HTTP failure", async () => {
    const fetchMock: typeof fetch = async () => new Response("nope", { status: 403 });
    const client = new ModeARNClient({
      apiBase: "https://example.com/api",
      fetchImpl: fetchMock,
    });
    await expect(client.getDashboardSnapshot()).rejects.toThrow(/403/);
  });
});
