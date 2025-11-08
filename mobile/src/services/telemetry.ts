import { buildApiUrl } from "../config/app-config";
import { getTelemetryGrant, setTelemetryGrant } from "./telemetry-auth";
import { clearTelemetryGrant as clearStoredTelemetryGrant } from "./session-storage";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

interface TelemetryOptions {
  source?: string;
  tokenOverride?: string | null;
}

export type TelemetryResult = {
  ok: boolean;
  status?: number;
};

export async function reportClientEvent(
  event: string,
  properties?: EventProperties,
  options: TelemetryOptions = {},
): Promise<TelemetryResult> {
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
    const response = await fetch(url, {
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
    if (!response.ok) {
      console.warn("telemetry.event_failed.http", {
        event,
        status: response.status,
        statusText: response.statusText,
      });
      await maybeClearTelemetryGrant({
        status: response.status,
        overrideToken,
        activeToken: telemetry?.token,
      });
      return { ok: false, status: response.status };
    }
    return { ok: true };
  } catch (error) {
    console.warn("telemetry.event_failed", { event, error });
    return { ok: false };
  }
}

async function maybeClearTelemetryGrant(params: {
  status?: number;
  overrideToken?: string | null;
  activeToken?: string | null;
}) {
  if (params.status !== 401) {
    return;
  }
  const isUsingOverride =
    typeof params.overrideToken === "string" &&
    params.overrideToken.trim().length > 0 &&
    params.overrideToken !== params.activeToken;
  if (isUsingOverride) {
    return;
  }
  await clearStoredTelemetryGrant();
  setTelemetryGrant(null);
}
