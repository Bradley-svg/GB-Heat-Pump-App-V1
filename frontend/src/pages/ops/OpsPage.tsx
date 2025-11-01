import { useCallback } from "react";

import { useApiClient } from "../../app/contexts";
import { useApiRequest } from "../../app/hooks/use-api-request";
import { Page, RequestErrorCallout } from "../../components";
import { formatDate, formatNumber, formatPercent } from "../../utils/format";
import type { OpsOverviewResponse } from "../../types/api";

export default function OpsPage() {
  const api = useApiClient();
  const fetchOverview = useCallback(
    ({ signal }: { signal: AbortSignal }) =>
      api.get<OpsOverviewResponse>("/api/ops/overview", { signal }),
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
  } = useApiRequest(fetchOverview, {
    autoRefreshMs: 60_000,
  });

  const hasData = Boolean(data);
  const errorTitle = hasData ? "Issues loading latest operations data" : "Unable to load operations metrics";
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

  if (!hasData && phase === "loading") {
    return (
      <Page title="Operations">
        <div className="card">Loading...</div>
      </Page>
    );
  }

  if (!hasData) {
    return (
      <Page title="Operations">
        {errorCallout ?? (
          <div className="card callout error">Unable to load operations metrics</div>
        )}
      </Page>
    );
  }

  const { ops_summary: summary, devices, thresholds, ops, recent, ops_window: windowMeta } = data;
  const warnThreshold = thresholds?.error_rate?.warn ?? null;
  const clientWarnThreshold = thresholds?.client_error_rate?.warn ?? null;
  const slowWarnThreshold = thresholds?.avg_duration_ms?.warn ?? null;
  const windowDescriptor =
    windowMeta ?
      `Window: last ${formatNumber(windowMeta.days, 0)} days (since ${formatDate(windowMeta.start)})` :
      null;

  return (
    <Page title="Operations">
      {errorCallout ? <div style={{ marginBottom: "1rem" }}>{errorCallout}</div> : null}
      <div className="grid kpis">
        <div className="card tight">
          <div className="muted">Requests observed</div>
          <div className="large-number">{formatNumber(summary.total_requests, 0)}</div>
          <div className="subdued">
            Generated {formatDate(data.generated_at)}
            {windowDescriptor ? ` \u2022 ${windowDescriptor}` : null}
          </div>
        </div>
        <div className="card tight">
          <div className="muted">Server error rate</div>
          <div className="large-number">{formatPercent(summary.server_error_rate * 100, 2)}</div>
          <div className="subdued">
            {warnThreshold !== null ? `Warns at ${formatPercent(warnThreshold * 100, 2)}` : "No threshold"}
          </div>
        </div>
        <div className="card tight">
          <div className="muted">Client error rate</div>
          <div className="large-number">{formatPercent(summary.client_error_rate * 100, 2)}</div>
          <div className="subdued">
            {clientWarnThreshold !== null ? `Warns at ${formatPercent(clientWarnThreshold * 100, 2)}` : "No threshold"}
          </div>
        </div>
        <div className="card tight">
          <div className="muted">Slow requests</div>
          <div className="large-number">{formatPercent(summary.slow_rate * 100, 2)}</div>
          <div className="subdued">
            {slowWarnThreshold !== null ? `Warns at ${formatNumber(slowWarnThreshold, 0)} ms` : "No threshold"}
          </div>
        </div>
        <div className="card tight">
          <div className="muted">Devices online</div>
          <div className="large-number">{formatNumber(devices.online, 0)}</div>
          <div className="subdued">
            {formatNumber(devices.offline, 0)} offline ({formatPercent(devices.offline_ratio * 100, 2)})
          </div>
        </div>
      </div>

      {(summary.slow_routes.length || summary.top_server_error_routes.length) ? (
        <div className="card mt-1">
          <div className="card-header">
            <div className="card-title">Hotspots</div>
          </div>
          <div className="stack">
            {summary.slow_routes.length ? (
              <div>
                <div className="muted">Slow routes</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0.25rem 0 0" }}>
                  {summary.slow_routes.map((route) => (
                    <li key={`${route.route}-${route.status_code}`}>
                      {route.route} ({route.status_code}) · {formatNumber(route.avg_duration_ms, 1)} ms avg ·{" "}
                      {formatNumber(route.count, 0)} calls
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {summary.top_server_error_routes.length ? (
              <div>
                <div className="muted">Server errors</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0.25rem 0 0" }}>
                  {summary.top_server_error_routes.map((route) => (
                    <li key={`${route.route}-${route.status_code}`}>
                      {route.route} ({route.status_code}) · {formatNumber(route.count, 0)} errors
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="card mt-1">
        <div className="card-header">
          <div className="card-title">Route breakdown</div>
          <span className="pill">{ops.length} groups</span>
        </div>
        {ops.length ? (
          <div className="min-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Avg ms</th>
                  <th>Max ms</th>
                  <th>Total ms</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((row) => (
                  <tr key={`${row.route}-${row.status_code}`}>
                    <td>{row.route}</td>
                    <td>{row.status_code}</td>
                    <td>{formatNumber(row.count, 0)}</td>
                    <td>{formatNumber(row.avg_duration_ms, 1)}</td>
                    <td>{formatNumber(row.max_duration_ms, 1)}</td>
                    <td>{formatNumber(row.total_duration_ms, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No aggregated metrics</div>
        )}
      </div>

      <div className="card mt-1">
        <div className="card-header">
          <div className="card-title">Recent events</div>
          <span className="pill">{recent.length} events</span>
        </div>
        {recent.length ? (
          <div className="min-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Duration ms</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row, index) => (
                  <tr key={`${row.ts}-${index}`}>
                    <td>{formatDate(row.ts)}</td>
                    <td>{row.route}</td>
                    <td>{row.status_code}</td>
                    <td>{formatNumber(row.duration_ms, 1)}</td>
                    <td>
                      {row.device_id ? (
                        row.lookup ? (
                          <a
                            className="link"
                            href={`/app/device?device=${encodeURIComponent(row.lookup)}`}
                          >
                            {row.device_id}
                          </a>
                        ) : (
                          row.device_id
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No recent events</div>
        )}
      </div>
    </Page>
  );
}
