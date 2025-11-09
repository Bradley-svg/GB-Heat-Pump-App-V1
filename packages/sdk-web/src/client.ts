import { deviceSchema, telemetryMetricsSchema } from "@greenbro/sdk-core";
import { z } from "zod";

export interface ModeAWebClientConfig {
  apiBase: string;
  accessToken?: () => Promise<string> | string;
}

const alertsSchema = z
  .array(
    z
      .object({
        id: z.string(),
        didPseudo: z.string(),
        alert_type: z.string(),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"),
        message: z.string(),
        raised_at: z.string().datetime(),
      })
      .strict(),
  )
  .default([]);

type FetchImpl = typeof fetch;

export class ModeAWebClient {
  constructor(private readonly config: ModeAWebClientConfig, private readonly fetchImpl: FetchImpl = fetch) {
    if (!this.config.apiBase) {
      throw new Error("apiBase is required");
    }
  }

  async getDevices() {
    const payload = await this.request("/devices");
    return z.array(deviceSchema).parse(payload);
  }

  async getLatest(didPseudo: string) {
    const payload = await this.request(`/devices/${encodeURIComponent(didPseudo)}/latest`);
    return telemetryMetricsSchema.parse(payload);
  }

  async getAlerts() {
    const payload = await this.request("/alerts");
    return alertsSchema.parse(payload);
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
