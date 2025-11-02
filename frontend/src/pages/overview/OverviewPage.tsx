import { useCallback } from "react";

import { useApiClient } from "../../app/contexts";
import { useApiRequest } from "../../app/hooks/use-api-request";
import { Page, RequestErrorCallout } from "../../components";
import { formatNumber, formatPercent, formatRelative } from "../../utils/format";
import type { FleetSummaryResponse } from "../../types/api";

export default function OverviewPage() {
  const api = useApiClient();
  const fetchSummary = useCallback(
    ({ signal }: { signal: AbortSignal }) =>
      api.get<FleetSummaryResponse>("/api/fleet/summary", { signal }),
    [api],
  );

  const {
    phase,
    data,
    error,
    retry,
    isRetryScheduled,
    nextRetryInMs,
    attempts,
    isFetching,
  } = useApiRequest(fetchSummary);

  const errorTitle = data ? "Issues loading latest fleet metrics" : "Failed to load fleet metrics";
  const errorCallout = error ? (
    <RequestErrorCallout
      title={errorTitle}
      error={error}
      onRetry={retry}
      retryScheduled={isRetryScheduled}
      nextRetryInMs={nextRetryInMs}
      attempts={attempts}
      busy={isFetching}
    />
  ) : null;

  if (!data && phase === "loading") {
    return (
      <Page title="Overview (Fleet)">
        <div className="card">Loading...</div>
      </Page>
    );
  }

  if (!data) {
    return (
      <Page title="Overview (Fleet)">
        {errorCallout ?? <div className="card callout error">Failed to load fleet metrics</div>}
      </Page>
    );
  }

  return (
    <Page title="Overview (Fleet)">
      {errorCallout ? <div style={{ marginBottom: "1rem" }}>{errorCallout}</div> : null}
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
      <div className="card mt-1">
        <div className="card-title">Devices</div>
        <div className="subdued">
          {data.devices_online}/{data.devices_total} online
        </div>
      </div>
    </Page>
  );
}
