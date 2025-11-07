import { apiClient } from "./api-client";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

export async function reportClientEvent(
  event: string,
  properties?: EventProperties,
  source = "mobile",
): Promise<void> {
  try {
    await apiClient.post("/api/observability/client-events", {
      event,
      source,
      timestamp: new Date().toISOString(),
      properties,
    });
  } catch (error) {
    console.warn("telemetry.event_failed", { event, error });
  }
}

