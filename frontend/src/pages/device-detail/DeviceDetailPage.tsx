import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useApiClient } from "../../app/contexts";
import { Page } from "../../components";
import { Sparkline } from "../../components/Sparkline";
import { formatDate, formatNumber, formatRelative } from "../../utils/format";
import type {
  DeviceHistoryResponse,
  DeviceLatestResponse,
  DeviceListItem,
  DeviceListResponse,
  LatestState,
} from "../../types/api";

export default function DeviceDetailPage() {
  const api = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryDevice = searchParams.get("device") ?? "";

  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [selected, setSelected] = useState<string>(queryDevice);
  const [latest, setLatest] = useState<DeviceLatestResponse | null>(null);
  const [history, setHistory] = useState<DeviceHistoryResponse["items"]>([]);
  const [selectedDisplay, setSelectedDisplay] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDevices() {
      try {
        const payload = await api.get<DeviceListResponse>("/api/devices?mine=1&limit=50");
        if (cancelled) return;
        const items = payload.items ?? [];
        setDevices(items);
        if (!selected && items.length > 0) {
          setSelected(items[0].lookup);
        }
      } catch {
        if (!cancelled) {
          setDevices([]);
        }
      }
    }

    void loadDevices();
    return () => {
      cancelled = true;
    };
  }, [api, selected]);

  const load = useCallback(
    async (lookup: string) => {
      if (!lookup) return;
      setLoading(true);
      setError(false);
      try {
        const [latestRes, historyRes] = await Promise.all([
          api.get<DeviceLatestResponse>(`/api/devices/${encodeURIComponent(lookup)}/latest`),
          api.get<DeviceHistoryResponse>(`/api/devices/${encodeURIComponent(lookup)}/history?limit=120`),
        ]);
        setLatest(latestRes);
        setHistory(historyRes.items ?? []);
        setSelectedDisplay(latestRes.device_id ?? "");
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    if (!selected) return;
    void load(selected);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("device", selected);
      return next;
    });
  }, [load, selected, setSearchParams]);

  const metrics: LatestState = useMemo(() => latest?.latest ?? {}, [latest]);
  const selectedDevice = useMemo(
    () => devices.find((device) => device.lookup === selected) ?? null,
    [devices, selected],
  );

  const historySeries = useMemo(() => {
    return {
      supply: history.map((row) => (typeof row.supplyC === "number" ? row.supplyC : null)),
      return: history.map((row) => (typeof row.returnC === "number" ? row.returnC : null)),
      thermal: history.map((row) => (typeof row.thermalKW === "number" ? row.thermalKW : null)),
      cop: history.map((row) => (typeof row.cop === "number" ? row.cop : null)),
    };
  }, [history]);

  const displayHistory = useMemo(() => history.slice(-10), [history]);

  const displayId = useMemo(() => {
    const trimmed = selectedDisplay.trim();
    if (trimmed.length > 0) return trimmed;
    return latest?.device_id ?? "-";
  }, [selectedDisplay, latest]);

  const updateLabel = (() => {
    if (metrics.updated_at != null) {
      return `Updated ${formatRelative(metrics.updated_at)}`;
    }
    if (metrics.ts != null) {
      return `Sample ${formatRelative(metrics.ts)}`;
    }
    return "";
  })();

  const renderMetric = useCallback(
    (key: keyof LatestState, label: string, dp = 1) => {
      const value = metrics[key];
      if (value === null || value === undefined) {
        return (
          <div className="metric-tile" key={String(key)}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">-</div>
          </div>
        );
      }
      if (typeof value === "number") {
        return (
          <div className="metric-tile" key={String(key)}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{formatNumber(value, dp)}</div>
          </div>
        );
      }
      return (
        <div className="metric-tile" key={String(key)}>
          <div className="metric-label">{label}</div>
          <div className="metric-value">{getMetricText(value)}</div>
        </div>
      );
    },
    [metrics],
  );

  return (
    <Page title="Device detail">
      <div className="card">
        <div className="flex">
          <div style={{ flex: "1 1 220px" }}>
            <label className="muted" htmlFor="device-select">
              Device
            </label>
            <select
              id="device-select"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Select a device</option>
              {devices.map((device) => (
                <option value={device.lookup} key={device.lookup}>
                  {device.device_id}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn"
            style={{ alignSelf: "flex-end" }}
            onClick={() => {
              if (selected) {
                void load(selected);
              }
            }}
            disabled={!selected || loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="callout error" style={{ marginTop: "1rem" }}>
            Unable to load device data
          </div>
        ) : null}

        {latest ? (
          <div className="stack" style={{ marginTop: "1rem" }}>
            <div className="grid-3">
              <div className="card tight">
                <div className="muted">Device ID</div>
                <div className="large-number">{displayId}</div>
                <div className="subdued">{updateLabel}</div>
              </div>
              <div className="card tight">
                <div className="muted">Status</div>
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginTop: ".4rem" }}>
                  <span
                    className={`status-dot${metrics.online ? " ok" : ""}`}
                    title={metrics.online ? "Online" : "Offline"}
                  />
                  <span>{metrics.online ? "Online" : "Offline"}</span>
                </div>
                <div className="subdued">{metrics.mode ?? "Mode unknown"}</div>
              </div>
              <div className="card tight">
                <div className="muted">Site</div>
                <div className="large-number">{selectedDevice?.site ?? "-"}</div>
                <div className="subdued">
                  Last heartbeat {formatRelative(selectedDevice?.last_seen_at ?? null)}
                </div>
              </div>
            </div>

            <div className="metric-grid">
              {renderMetric("supplyC", "Supply \u00B0C", 1)}
              {renderMetric("returnC", "Return \u00B0C", 1)}
              {renderMetric("deltaT", "\u0394T \u00B0C", 1)}
              {renderMetric("thermalKW", "Thermal kW", 2)}
              {renderMetric("cop", "COP", 2)}
              {renderMetric("flowLps", "Flow L/s", 2)}
              {renderMetric("powerKW", "Power kW", 2)}
            </div>

            <div className="grid auto" style={{ marginTop: "1rem" }}>
              <div className="card tight">
                <div className="muted">Supply trend</div>
                <Sparkline values={historySeries.supply} color="#52ff99" />
                <div className="subdued">
                  Latest {formatNumber(lastValue(historySeries.supply), 1)} \u00B0C
                </div>
              </div>
              <div className="card tight">
                <div className="muted">Return trend</div>
                <Sparkline values={historySeries.return} color="#86a5ff" />
                <div className="subdued">
                  Latest {formatNumber(lastValue(historySeries.return), 1)} \u00B0C
                </div>
              </div>
              <div className="card tight">
                <div className="muted">Thermal output</div>
                <Sparkline values={historySeries.thermal} color="#ffcc66" />
                <div className="subdued">
                  Latest {formatNumber(lastValue(historySeries.thermal), 2)} kW
                </div>
              </div>
              <div className="card tight">
                <div className="muted">COP trend</div>
                <Sparkline values={historySeries.cop} color="#52ff99" />
                <div className="subdued">Latest {formatNumber(lastValue(historySeries.cop), 2)}</div>
              </div>
            </div>

            {displayHistory.length ? (
              <div className="card" style={{ marginTop: "1rem" }}>
                <div className="card-header">
                  <div className="card-title">Recent telemetry</div>
                  <div className="subdued">{displayHistory.length} samples</div>
                </div>
                <div className="min-table">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Supply</th>
                        <th>Return</th>
                        <th>Thermal kW</th>
                        <th>COP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayHistory.map((row) => (
                        <tr key={row.ts}>
                          <td>{formatDate(row.ts)}</td>
                          <td>{formatNumber(row.supplyC, 1)}</td>
                          <td>{formatNumber(row.returnC, 1)}</td>
                          <td>{formatNumber(row.thermalKW, 2)}</td>
                          <td>{formatNumber(row.cop, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="empty" style={{ marginTop: "1rem" }}>
            {selected ? "Select refresh to load details" : "Choose a device to load telemetry"}
          </div>
        )}
      </div>
    </Page>
  );
}

function getMetricText(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "-";
}

function lastValue(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const value = values[i];
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }
  }
  return null;
}
