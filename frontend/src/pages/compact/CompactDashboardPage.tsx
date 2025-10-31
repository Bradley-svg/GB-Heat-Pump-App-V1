import { useEffect, useMemo, useState } from "react";

import { useApiClient } from "../../app/contexts";
import { Page } from "../../components";
import { Sparkline } from "../../components/Sparkline";
import { formatNumber, formatPercent, formatRelative } from "../../utils/format";
import type { ClientCompactResponse, DeviceListItem, DeviceListResponse } from "../../types/api";

type TrendKey = "cop" | "thermalKW" | "deltaT";
type AsyncState = "loading" | "error" | "ready";

export default function CompactDashboardPage() {
  const api = useApiClient();
  const [summary, setSummary] = useState<ClientCompactResponse | null>(null);
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [state, setState] = useState<AsyncState>("loading");
  const [trendKey, setTrendKey] = useState<TrendKey>("cop");

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function loadSummary() {
      try {
        const payload = await api.get<ClientCompactResponse>("/api/client/compact", {
          signal: controller.signal,
        });
        if (!cancelled) {
          setSummary(payload);
          setState("ready");
        }
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setState("error");
        }
      }
    }

    async function loadRoster() {
      try {
        const payload = await api.get<DeviceListResponse>("/api/devices?mine=1&limit=12", {
          signal: controller.signal,
        });
        if (!cancelled) {
          setDevices(payload.items ?? []);
        }
      } catch {
        // ignore roster errors; summary is more critical
      }
    }

    void loadSummary();
    void loadRoster();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api]);

  const trendValues = useMemo(() => {
    if (!summary) return [];
    return (summary.trend ?? []).map((point) => {
      const value = point[trendKey];
      return typeof value === "number" ? value : null;
    });
  }, [summary, trendKey]);

  const trendSubtitle = useMemo(() => {
    switch (trendKey) {
      case "cop":
        return "Fleet average COP";
      case "thermalKW":
        return "Thermal output (kW)";
      case "deltaT":
        return "?T average (°C)";
      default:
        return "";
    }
  }, [trendKey]);

  if (state === "loading") {
    return (
      <Page title="My Sites - Compact">
        <div className="card">Loading...</div>
      </Page>
    );
  }

  if (state === "error" || !summary) {
    return (
      <Page title="My Sites - Compact">
        <div className="card callout error">Unable to load dashboard data</div>
      </Page>
    );
  }

  const kpis = summary.kpis;

  return (
    <Page title="My Sites - Compact">
      <div className="grid kpis">
        <div className="card tight">
          <div className="muted">Online rate</div>
          <div className="large-number">{formatPercent(kpis.online_pct)}</div>
          <div className="subdued">
            {kpis.devices_online}/{kpis.devices_total} devices online
          </div>
        </div>
        <div className="card tight">
          <div className="muted">Open alerts</div>
          <div className="large-number">{formatNumber(kpis.open_alerts ?? 0, 0)}</div>
          <div className="subdued">
            {summary.alerts?.length ? `${summary.alerts.length} devices affected` : "Monitoring"}
          </div>
        </div>
        <div className="card tight">
          <div className="muted">Avg COP</div>
          <div className="large-number">{formatNumber(kpis.avg_cop, 2)}</div>
          <div className="subdued">Window start {formatRelative(summary.window_start_ms)}</div>
        </div>
        <div className="card tight">
          <div className="muted">Low ?T (24h)</div>
          <div className="large-number">{formatNumber(kpis.low_deltaT_count ?? 0, 0)}</div>
          <div className="subdued">
            {kpis.max_heartbeat_age_sec
              ? `Oldest heartbeat ${formatNumber((kpis.max_heartbeat_age_sec ?? 0) / 60, 1)}m`
              : "All fresh"}
          </div>
        </div>
      </div>

      <div className="card chart-card">
        <div className="card-header">
          <div>
            <div className="muted">Performance trend</div>
            <div style={{ fontSize: "16px", fontWeight: 600, marginTop: ".2rem" }}>{trendSubtitle}</div>
          </div>
          <div className="tabs">
            <button
              type="button"
              className={`btn ghost${trendKey === "cop" ? " active" : ""}`}
              onClick={() => setTrendKey("cop")}
            >
              COP
            </button>
            <button
              type="button"
              className={`btn ghost${trendKey === "thermalKW" ? " active" : ""}`}
              onClick={() => setTrendKey("thermalKW")}
            >
              Thermal kW
            </button>
            <button
              type="button"
              className={`btn ghost${trendKey === "deltaT" ? " active" : ""}`}
              onClick={() => setTrendKey("deltaT")}
            >
              ?T
            </button>
          </div>
        </div>
        <div style={{ padding: "0 1rem 1rem" }}>
          <Sparkline
            values={trendValues}
            color={trendKey === "cop" ? "#52ff99" : trendKey === "thermalKW" ? "#7d96ff" : "#ffcc66"}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent alerts</div>
          {summary.alerts?.length ? (
            <span className="pill warn">{summary.alerts.length} active</span>
          ) : (
            <span className="pill">Stable</span>
          )}
        </div>
        {summary.alerts?.length ? (
          <div className="list">
            {summary.alerts.map((alert) => (
              <div className="list-item" key={alert.lookup}>
                <div>
                  <div style={{ fontWeight: 600 }}>{alert.device_id}</div>
                  {alert.site ? <div className="subdued">{alert.site}</div> : null}
                  <div className="meta">Updated {formatRelative(alert.updated_at)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>{alert.faults?.slice(0, 3).join(", ") || "Fault reported"}</div>
                  <div className="meta">
                    {alert.faults && alert.faults.length > 3 ? `+${alert.faults.length - 3} more` : ""}
                  </div>
                  <a
                    href={`/app/device?device=${encodeURIComponent(alert.lookup)}`}
                    className="link"
                    style={{ marginTop: ".4rem", display: "inline-block" }}
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No alerts in the selected window</div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Device roster</div>
          <div className="subdued">{devices.length ? `${devices.length} listed` : "No devices yet"}</div>
        </div>
        {devices.length ? (
          <div className="min-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Site</th>
                  <th>Online</th>
                  <th>Last heartbeat</th>
                  <th>Firmware</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.lookup}>
                    <td>
                      <a href={`/app/device?device=${encodeURIComponent(device.lookup)}`} className="link">
                        {device.device_id || "(device)"}
                      </a>
                    </td>
                    <td>{device.site ?? "—"}</td>
                    <td>
                      <span
                        className={`status-dot${device.online ? " ok" : ""}`}
                        title={device.online ? "Online" : "Offline"}
                      />
                    </td>
                    <td>{formatRelative(device.last_seen_at)}</td>
                    <td>{device.firmware ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No devices in scope</div>
        )}
      </div>
    </Page>
  );
}
