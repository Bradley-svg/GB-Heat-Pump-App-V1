import { telemetryMetricsSchema } from "@greenbro/sdk-core";
import { z } from "zod";

export interface StorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}

const memoryStorage: StorageAdapter = {
  async getItem() {
    return null;
  },
  async setItem() {
    return;
  },
};

const dashboardAlertSchema = z
  .object({
    device_id: z.string(),
    lookup: z.string(),
    site: z.string().nullable(),
    ts: z.string(),
    updated_at: z.string().nullable(),
    faults: z.array(z.string()),
    fault_count: z.number(),
  })
  .strict();

const dashboardDeviceSchema = z
  .object({
    device_id: z.string(),
    lookup: z.string(),
    site: z.string().nullable(),
    online: z.boolean(),
    last_seen_at: z.string().nullable(),
    updated_at: z.string().nullable(),
    supplyC: z.number().nullable(),
    returnC: z.number().nullable(),
    cop: z.number().nullable(),
    deltaT: z.number().nullable(),
    thermalKW: z.number().nullable(),
    alert_count: z.number(),
  })
  .strict();

const dashboardSnapshotSchema = z
  .object({
    generated_at: z.string(),
    scope: z.enum(["empty", "tenant", "fleet"]),
    window_start_ms: z.number(),
    kpis: z.object({
      devices_total: z.number(),
      devices_online: z.number(),
      offline_count: z.number(),
      online_pct: z.number(),
      avg_cop: z.number().nullable(),
      low_deltaT_count: z.number(),
      open_alerts: z.number(),
      max_heartbeat_age_sec: z.number().nullable(),
    }),
    alerts: z.array(dashboardAlertSchema),
    top_devices: z.array(dashboardDeviceSchema),
    trend: z.array(
      z.object({
        label: z.string(),
        cop: z.number().nullable(),
        thermalKW: z.number().nullable(),
        deltaT: z.number().nullable(),
      }),
    ),
  })
  .strict();

export type DashboardSnapshot = z.infer<typeof dashboardSnapshotSchema>;

export interface ModeARNClientConfig {
  apiBase: string;
  storage?: StorageAdapter;
  fetchImpl?: typeof fetch;
}

export class ModeARNClient {
  private readonly storage: StorageAdapter;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: ModeARNClientConfig) {
    if (!config.apiBase) throw new Error("apiBase is required");
    this.storage = config.storage ?? memoryStorage;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async getLatest(deviceToken: string) {
    const res = await this.fetchJson(`/devices/${encodeURIComponent(deviceToken)}/latest`);
    return telemetryMetricsSchema.parse(res);
  }

  async getDashboardSnapshot(params?: DashboardSnapshotParams): Promise<DashboardSnapshot> {
    const qs = buildDashboardQuery(params);
    const payload = await this.fetchJson(`/client/compact${qs}`);
    const parsed = dashboardSnapshotSchema.parse(payload);
    await this.storage.setItem("modea:snapshot", JSON.stringify(parsed));
    return parsed;
  }

  private async fetchJson(path: string, init?: RequestInit) {
    const res = await this.fetchImpl(`${this.config.apiBase}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`ModeA RN error ${res.status}: ${body}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }
}

export interface DashboardSnapshotParams {
  hours?: number;
  lowDeltaT?: number;
}

function buildDashboardQuery(params?: DashboardSnapshotParams) {
  if (!params) return "";
  const query = new URLSearchParams();
  if (params.hours) query.set("hours", String(params.hours));
  if (params.lowDeltaT) query.set("lowDeltaT", String(params.lowDeltaT));
  const str = query.toString();
  return str ? `?${str}` : "";
}
