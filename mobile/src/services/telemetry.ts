import { buildApiUrl } from "../config/app-config";
import { getTelemetryGrant } from "./telemetry-auth";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

interface TelemetryOptions {
  source?: string;
  tokenOverride?: string | null;
}

export async function reportClientEvent(
  event: string,
  properties?: EventProperties,
  options: TelemetryOptions = {},
): Promise<boolean> {
  try {
    const url = buildApiUrl("/api/observability/client-events");
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    const overrideToken = options.tokenOverride?.trim();
    const telemetry = getTelemetryGrant();
    const token = overrideToken?.length ? overrideToken : telemetry?.token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    await fetch(url, {
      method: "POST",
      credentials: "omit",
      headers,
      body: JSON.stringify({
        event,
        source: options.source ?? "mobile",
        timestamp: new Date().toISOString(),
        properties,
      }),
    });
    return true;
  } catch (error) {
    console.warn("telemetry.event_failed", { event, error });
    return false;
  }
}
