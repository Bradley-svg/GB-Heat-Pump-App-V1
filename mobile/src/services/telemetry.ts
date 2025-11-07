import { buildApiUrl } from "../config/app-config";
import { getSessionCookie } from "./api-client";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

interface TelemetryOptions {
  source?: string;
  cookie?: string | null;
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
    const cookie = options.cookie ?? getSessionCookie();
    if (cookie) {
      headers.Cookie = cookie;
    }
    await fetch(url, {
      method: "POST",
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
