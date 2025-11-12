import { useCallback } from "react";

import { useApiClient } from "../../app/contexts";
import { useApiRequest } from "../../app/hooks/use-api-request";
import type {
  DeviceListResponse,
  TelemetryLatestBatchItem,
  TelemetryLatestBatchResponse,
  TelemetrySeriesResponse,
} from "../../types/api";

interface DeviceTelemetryData {
  latest: TelemetryLatestBatchItem | null;
  series: TelemetrySeriesResponse | null;
}

export function useDeviceRoster(scopeMine: boolean) {
  const api = useApiClient();

  const fetchRoster = useCallback(
    ({ signal }: { signal: AbortSignal }) => {
      const params = new URLSearchParams({
        limit: "50",
        mine: scopeMine ? "1" : "0",
      });
      return api.get<DeviceListResponse>(`/api/devices?${params.toString()}`, { signal });
    },
    [api, scopeMine],
  );

  return useApiRequest(fetchRoster, { enableAutoRetry: true });
}

export function useDeviceTelemetry(lookup: string | null) {
  const api = useApiClient();

  const fetchTelemetry = useCallback(
    async ({ signal }: { signal: AbortSignal }): Promise<DeviceTelemetryData> => {
      if (!lookup) {
        return { latest: null, series: null };
      }

      const params = new URLSearchParams({
        scope: "device",
        device: lookup,
        interval: "5m",
        limit: "120",
        fill: "carry",
      });

      const [latestBatch, series] = await Promise.all([
        api.post<TelemetryLatestBatchResponse>("/api/telemetry/latest-batch", { devices: [lookup] }, { signal }),
        api.get<TelemetrySeriesResponse>(`/api/telemetry/series?${params.toString()}`, { signal }),
      ]);

      return {
        latest: latestBatch.items?.[0] ?? null,
        series,
      };
    },
    [api, lookup],
  );

  return useApiRequest<DeviceTelemetryData>(fetchTelemetry, { enableAutoRetry: true });
}
