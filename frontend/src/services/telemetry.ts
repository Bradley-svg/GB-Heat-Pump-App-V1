import type { ApiClient } from "./api-client";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

export async function trackClientEvent(
  api: ApiClient,
  event: string,
  properties?: EventProperties,
  source = "web",
): Promise<void> {
  try {
    await api.post("/api/observability/client-events", {
      event,
      source,
      timestamp: new Date().toISOString(),
      properties,
    });
  } catch (error) {
    console.warn("telemetry.event_failed", { event, error });
  }
}

