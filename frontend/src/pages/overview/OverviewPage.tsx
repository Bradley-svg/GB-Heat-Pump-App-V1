import { useEffect, useState } from "react";

import { useApiClient } from "../../app/contexts";
import { Page } from "../../components";
import { formatNumber, formatPercent, formatRelative } from "../../utils/format";
import type { FleetSummaryResponse } from "../../types/api";

export default function OverviewPage() {
  const api = useApiClient();
  const [data, setData] = useState<FleetSummaryResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    api
      .get<FleetSummaryResponse>("/api/fleet/summary", { signal: controller.signal })
      .then((payload) => {
        setData(payload);
        setState("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
      });
    return () => controller.abort();
  }, [api]);

  if (state === "loading") {
    return (
      <Page title="Overview (Fleet)">
        <div className="card">Loading...</div>
      </Page>
    );
  }

  if (state === "error" || !data) {
    return (
      <Page title="Overview (Fleet)">
        <div className="card callout error">Failed to load fleet metrics</div>
      </Page>
    );
  }

  return (
    <Page title="Overview (Fleet)">
      <div className="grid kpis">
        <div className="card tight">
          <div className="muted">Online %</div>
          <div className="large-number">{formatPercent(data.online_pct)}</div>
          <div className="subdued">
            {data.devices_online}/{data.devices_total} online
          </div>
        </div>
        <div className="card tight">
          <div className="muted">Avg COP (24h)</div>
          <div className="large-number">{formatNumber(data.avg_cop_24h, 2)}</div>
          <div className="subdued">Window start {formatRelative(data.window_start_ms)}</div>
        </div>
        <div className="card tight">
          <div className="muted">Low ?T events</div>
          <div className="large-number">{formatNumber(data.low_deltaT_count_24h ?? 0, 0)}</div>
          <div className="subdued">
            Oldest heartbeat {formatNumber((data.max_heartbeat_age_sec ?? 0) / 60, 1)}m
          </div>
        </div>
      </div>
      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="card-title">Devices</div>
        <div className="subdued">
          {data.devices_online}/{data.devices_total} online
        </div>
      </div>
    </Page>
  );
}
