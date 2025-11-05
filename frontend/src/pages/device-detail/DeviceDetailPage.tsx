import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useApiClient, useCurrentUserState } from "../../app/contexts";
import { Page } from "../../components";
import { Sparkline } from "../../components/Sparkline";
import { formatDate, formatNumber, formatRelative } from "../../utils/format";
import type {
  DeviceListItem,
  DeviceListResponse,
  TelemetryLatestBatchItem,
  TelemetryLatestBatchResponse,
  TelemetryLatestSnapshot,
  TelemetryMetric,
  TelemetrySeriesEntry,
  TelemetrySeriesResponse,
} from "../../types/api";

export default function DeviceDetailPage() {
  const api = useApiClient();
  const currentUser = useCurrentUserState();
  const user = currentUser.user;
  const isAdmin = useMemo(
    () => (user?.roles ?? []).some((role) => role.toLowerCase() === "admin"),
    [user?.roles],
  );
  const [mineOnly, setMineOnly] = useState<boolean>(() => !isAdmin);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryDevice = searchParams.get("device") ?? "";

  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [selected, setSelected] = useState<string>(queryDevice);
  const [latest, setLatest] = useState<TelemetryLatestBatchItem | null>(null);
  const [series, setSeries] = useState<TelemetrySeriesResponse | null>(null);
  const [selectedDisplay, setSelectedDisplay] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState(false);
  const [deviceLoadError, setDeviceLoadError] = useState(false);
  const scopeMine = isAdmin ? mineOnly : true;
  const requestIdRef = useRef(0);
  const previousIsAdminRef = useRef(isAdmin);
  const telemetryControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      telemetryControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!previousIsAdminRef.current && isAdmin) {
      setMineOnly(false);
    }
    previousIsAdminRef.current = isAdmin;
  }, [isAdmin]);

  useEffect(() => {
    if (!queryDevice) return;
    setSelected((prev) => (prev === queryDevice ? prev : queryDevice));
  }, [queryDevice]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadDevices() {
      try {
        const params = new URLSearchParams({
          limit: "50",
          mine: scopeMine ? "1" : "0",
        });
        const payload = await api.get<DeviceListResponse>(`/api/devices?${params.toString()}`, {
          signal: controller.signal,
        });
        if (cancelled) return;
        const items = payload.items ?? [];
        setDevices(items);
        setSelected((prev) => {
          if (prev && items.some((device) => device.lookup === prev)) {
            return prev;
          }
          return items[0]?.lookup ?? "";
        });
        setDeviceLoadError(false);
      } catch {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setDevices([]);
        setSelected("");
        setLatest(null);
        setSeries(null);
        setSelectedDisplay("");
        setDeviceLoadError(true);
      }
    }

    void loadDevices();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api, scopeMine]);

  const load = useCallback(
    async (lookup: string) => {
      if (!lookup) return;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      setTelemetryError(false);
      telemetryControllerRef.current?.abort();
      const controller = new AbortController();
      telemetryControllerRef.current = controller;
      try {
        const params = new URLSearchParams({
          scope: "device",
          device: lookup,
          interval: "5m",
          limit: "120",
          fill: "carry",
        });
        const [latestRes, seriesRes] = await Promise.all([
          api.post<TelemetryLatestBatchResponse>(
            "/api/telemetry/latest-batch",
            { devices: [lookup] },
            { signal: controller.signal },
          ),
          api.get<TelemetrySeriesResponse>(`/api/telemetry/series?${params.toString()}`, {
            signal: controller.signal,
          }),
        ]);
        if (!isMountedRef.current || requestIdRef.current !== requestId || controller.signal.aborted) {
          return;
        }
        const batchItem = latestRes.items?.[0] ?? null;
        setLatest(batchItem);
        setSeries(seriesRes);
        setSelectedDisplay(batchItem?.device_id ?? "");
        setLoading(false);
      } catch (error) {
        if (!isMountedRef.current || controller.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }
        setTelemetryError(true);
        setLoading(false);
      } finally {
        if (telemetryControllerRef.current === controller) {
          telemetryControllerRef.current = null;
        }
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

  const metrics: TelemetryLatestSnapshot = useMemo(() => latest?.latest ?? {}, [latest]);
  const selectedDevice = useMemo(
    () => devices.find((device) => device.lookup === selected) ?? null,
    [devices, selected],
  );

  const historySeries = useMemo(() => {
    const buckets = series?.series ?? [];
    return {
      supply: buckets.map((bucket) => metricAvg(bucket, "supplyC")),
      return: buckets.map((bucket) => metricAvg(bucket, "returnC")),
      thermal: buckets.map((bucket) => metricAvg(bucket, "thermalKW")),
      cop: buckets.map((bucket) => metricAvg(bucket, "cop")),
    };
  }, [series]);

  const displayHistory = useMemo(() => {
    const buckets = series?.series ?? [];
    return buckets.slice(-10).reverse();
  }, [series]);

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

  const actions = isAdmin ? (
    <div className="tabs" role="group" aria-label="Device scope filter">
      <button
        type="button"
        className={`btn ghost${scopeMine ? " active" : ""}`}
        aria-pressed={scopeMine}
        onClick={() => setMineOnly(true)}
      >
        Assigned
      </button>
      <button
        type="button"
        className={`btn ghost${!scopeMine ? " active" : ""}`}
        aria-pressed={!scopeMine}
        onClick={() => setMineOnly(false)}
      >
        All devices
      </button>
    </div>
  ) : null;

  const renderMetric = useCallback(
    (key: keyof TelemetryLatestSnapshot, label: string, dp = 1) => {
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
    <Page title="Device detail" actions={actions}>
      <div className="card">
        <div className="flex">
          <div className="flex-basis-220">
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
            className="btn align-self-end"
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

        {telemetryError ? (
          <div className="callout error mt-1">
            Unable to load device data
          </div>
        ) : null}

        {deviceLoadError ? (
          <div className="callout error mt-1">Unable to load devices</div>
        ) : null}

        {latest ? (
          <div className="stack mt-1">
            <div className="grid-3">
              <div className="card tight">
                <div className="muted">Device ID</div>
                <div className="large-number">{displayId}</div>
                <div className="subdued">{updateLabel}</div>
              </div>
              <div className="card tight">
                <div className="muted">Status</div>
                <div className="status-row">
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

            <div className="grid auto mt-1">
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
              <div className="card mt-1">
                <div className="card-header">
                  <div className="card-title">Recent telemetry</div>
                  <div className="subdued">{displayHistory.length} buckets</div>
                </div>
                <div className="min-table">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Samples</th>
                        <th>Supply</th>
                        <th>Return</th>
                        <th>Thermal kW</th>
                        <th>COP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayHistory.map((row) => (
                        <tr key={row.bucket_start}>
                          <td>{formatDate(row.bucket_start)}</td>
                          <td>{row.sample_count}</td>
                          <td>{formatNumber(metricAvg(row, "supplyC"), 1)}</td>
                          <td>{formatNumber(metricAvg(row, "returnC"), 1)}</td>
                          <td>{formatNumber(metricAvg(row, "thermalKW"), 2)}</td>
                          <td>{formatNumber(metricAvg(row, "cop"), 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="empty mt-1">
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

function metricAvg(entry: TelemetrySeriesEntry, metric: TelemetryMetric): number | null {
  const value = entry.values?.[metric];
  const avg = value?.avg;
  return typeof avg === "number" && Number.isFinite(avg) ? avg : null;
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
