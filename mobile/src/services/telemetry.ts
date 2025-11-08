import { buildApiUrl } from "../config/app-config";
import { ApiError } from "./api-client";
import { getTelemetryGrant, setTelemetryGrant, type TelemetryGrant } from "./telemetry-auth";
import {
  clearTelemetryGrant as clearStoredTelemetryGrant,
  persistTelemetryGrant,
} from "./session-storage";
import { refreshTelemetryGrant } from "./auth-service";

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
  const overrideToken = options.tokenOverride?.trim();
  const telemetry = getTelemetryGrant();
  const initialToken = overrideToken?.length ? overrideToken : telemetry?.token;
  const tokenSource =
    overrideToken?.length ? "override" : telemetry?.token ? "grant" : "none";

  return sendTelemetryEvent({
    event,
    properties,
    source: options.source ?? "mobile",
    token: initialToken,
    tokenSource,
    attemptedRefresh: false,
  });
}

interface SendParams {
  event: string;
  properties?: EventProperties;
  source: string;
  token?: string | null;
  tokenSource: "override" | "grant" | "none";
  attemptedRefresh: boolean;
}

async function sendTelemetryEvent(params: SendParams): Promise<TelemetryResult> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (params.token) {
    headers.Authorization = `Bearer ${params.token}`;
  }
  try {
    const response = await fetch(buildApiUrl("/api/observability/client-events"), {
      method: "POST",
      credentials: "omit",
      headers,
      body: JSON.stringify({
        event: params.event,
        source: params.source,
        timestamp: new Date().toISOString(),
        properties: params.properties,
      }),
    });
    if (response.ok) {
      return { ok: true };
    }

    if (
      response.status === 401 &&
      params.tokenSource === "grant" &&
      !params.attemptedRefresh
    ) {
      const refreshed = await attemptTelemetryRefresh();
      if (refreshed) {
        return sendTelemetryEvent({
          ...params,
          token: refreshed.token,
          attemptedRefresh: true,
        });
      }
    }

    if (response.status === 401 && params.tokenSource === "grant") {
      await clearStoredTelemetryGrant();
      setTelemetryGrant(null);
    }

    console.warn("telemetry.event_failed.http", {
      event: params.event,
      status: response.status,
      statusText: response.statusText,
    });

    return { ok: false, status: response.status };
  } catch (error) {
    console.warn("telemetry.event_failed", { event: params.event, error });
    return { ok: false };
  }
}

async function attemptTelemetryRefresh(): Promise<TelemetryGrant | null> {
  try {
    const refreshed = await refreshTelemetryGrant();
    setTelemetryGrant(refreshed);
    await persistTelemetryGrant(refreshed);
    return refreshed;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : undefined;
    console.warn("telemetry.refresh_failed", { status, error });
    await clearStoredTelemetryGrant();
    setTelemetryGrant(null);
    return null;
  }
}
