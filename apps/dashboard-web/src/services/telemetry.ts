import { readAppConfig } from "../app/config";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

const EVENT_ENDPOINT = "/api/observability/client-events";

export async function trackClientEvent(event: string, properties?: EventProperties, source = "web"): Promise<void> {
  try {
    const origin =
      typeof window !== "undefined" && window.location ?
        new URL(EVENT_ENDPOINT, window.location.origin).toString() :
        `${readAppConfig().apiBase}${EVENT_ENDPOINT}`;
    await fetch(origin, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        event,
        source,
        timestamp: new Date().toISOString(),
        properties,
      }),
    });
  } catch (error) {
    console.warn("telemetry.event_failed", { event, error });
  }
}
