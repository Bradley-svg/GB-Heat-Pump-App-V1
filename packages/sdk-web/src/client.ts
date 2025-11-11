import { telemetryMetricsSchema } from "@greenbro/sdk-core";
import { z } from "zod";

export interface ModeAWebClientConfig {
  apiBase: string;
  accessToken?: () => Promise<string> | string;
}


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

type FetchImpl = typeof fetch;

export class ModeAWebClient {
  constructor(private readonly config: ModeAWebClientConfig, private readonly fetchImpl: FetchImpl = fetch) {
    if (!this.config.apiBase) {
      throw new Error("apiBase is required");
    }
  }

  async getLatest(deviceToken: string) {
    const payload = await this.request(`/devices/${encodeURIComponent(deviceToken)}/latest`);
    return telemetryMetricsSchema.parse(payload);
  }

  async getDashboardSnapshot(params?: DashboardSnapshotParams): Promise<DashboardSnapshot> {
    const qs = buildDashboardQuery(params);
    const payload = await this.request(`/client/compact${qs}`);
    return dashboardSnapshotSchema.parse(payload);
  }

  private async request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    const token = await this.resolveToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await this.fetchImpl(`${this.config.apiBase}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ModeA API error ${res.status}: ${text}`);
    }
    if (res.status === 204) {
      return null;
    }
    return res.json();
  }

  private async resolveToken(): Promise<string | undefined> {
    if (!this.config.accessToken) return undefined;
    const token = await this.config.accessToken();
    return token || undefined;
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
