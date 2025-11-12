import { useCallback, useEffect, useState } from "react";

import { apiClient } from "../services/api-client";

interface FleetKpis {
  devices_total: number;
  devices_online: number;
  offline_count: number;
  online_pct: number;
  avg_cop: number | null;
  low_deltaT_count: number;
  open_alerts: number;
  max_heartbeat_age_sec: number | null;
}

interface TrendPoint {
  label: string;
  cop: number | null;
  thermalKW: number | null;
  deltaT: number | null;
}

interface TopDevice {
  device_id: string;
  site: string | null;
  online: boolean;
  last_seen_at: string | null;
  updated_at: string | null;
  supplyC: number | null;
  returnC: number | null;
  cop: number | null;
  deltaT: number | null;
  thermalKW: number | null;
  alert_count: number;
  lookup?: Record<string, unknown>;
}

interface ClientCompactResponse {
  generated_at: string;
  kpis: FleetKpis;
  trend: TrendPoint[];
  top_devices: TopDevice[];
}

type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface FleetSummaryResult {
  data: ClientCompactResponse | null;
  status: AsyncStatus;
  error: Error | null;
  refresh: () => void;
}

export function useFleetSummary(
  params: { hours?: number; lowDeltaT?: number } = {},
): FleetSummaryResult {
  const { hours = 24, lowDeltaT = 2 } = params;
  const [data, setData] = useState<ClientCompactResponse | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setStatus("loading");
      setError(null);
      try {
        const payload = await apiClient.get<ClientCompactResponse>(
          "/api/client/compact",
          {
            query: { hours, lowDeltaT },
            signal: controller.signal,
          },
        );
        setData(payload);
        setStatus("success");
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err as Error);
        setStatus("error");
      }
    }
    void load();
    return () => controller.abort();
  }, [hours, lowDeltaT, version]);

  const refresh = useCallback(() => {
    setVersion((prev) => prev + 1);
  }, []);

  return { data, status, error, refresh };
}
