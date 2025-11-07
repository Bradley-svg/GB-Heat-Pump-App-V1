import { useCallback, useEffect, useState } from "react";

import { apiClient } from "../services/api-client";

export interface AlertRecord {
  alert_id: string;
  device_id: string;
  site: string | null;
  alert_type?: string | null;
  severity: string | null;
  status: string;
  summary: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  lookup?: Record<string, unknown>;
}

interface AlertListResponse {
  generated_at: string;
  items: AlertRecord[];
}

type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AlertsFeedResult {
  data: AlertListResponse | null;
  status: AsyncStatus;
  error: Error | null;
  refresh: () => void;
}

export function useAlertsFeed(
  params: { limit?: number; status?: string } = {},
): AlertsFeedResult {
  const { limit = 50, status = "open" } = params;
  const [data, setData] = useState<AlertListResponse | null>(null);
  const [state, setState] = useState<AsyncStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setState("loading");
      setError(null);
      try {
        const payload = await apiClient.get<AlertListResponse>("/api/alerts", {
          query: { limit, status },
          signal: controller.signal,
        });
        setData(payload);
        setState("success");
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err as Error);
        setState("error");
      }
    }
    void load();
    return () => controller.abort();
  }, [limit, status, version]);

  const refresh = useCallback(() => {
    setVersion((prev) => prev + 1);
  }, []);

  return { data, status: state, error, refresh };
}
