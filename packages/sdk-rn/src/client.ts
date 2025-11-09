import { deviceSchema, telemetryMetricsSchema } from "@greenbro/sdk-core";
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

const alertsSchema = z.array(
  z.object({
    id: z.string(),
    didPseudo: z.string(),
    alert_type: z.string(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"),
    message: z.string(),
    raised_at: z.string().datetime(),
  }),
);

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

  async getDevices() {
    const res = await this.fetchJson("/devices");
    const parsed = z.array(deviceSchema).parse(res);
    await this.storage.setItem("modea:devices", JSON.stringify(parsed));
    return parsed;
  }

  async getLatest(didPseudo: string) {
    const res = await this.fetchJson(`/devices/${encodeURIComponent(didPseudo)}/latest`);
    return telemetryMetricsSchema.parse(res);
  }

  async getAlerts() {
    const res = await this.fetchJson("/alerts");
    return alertsSchema.parse(res);
  }

  private async fetchJson(path: string) {
    const res = await this.fetchImpl(`${this.config.apiBase}${path}`, {
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
