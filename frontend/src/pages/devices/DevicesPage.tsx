import { useCallback, useEffect, useState } from "react";

import { useApiClient } from "../../app/contexts";
import { Page } from "../../components";
import { formatRelative } from "../../utils/format";
import type { DeviceListItem, DeviceListResponse } from "../../types/api";

interface ListState  {
  items: DeviceListItem[];
  cursor: string | null;
  loading: boolean;
  error: boolean;
};

const INITIAL_STATE: ListState = {
  items: [],
  cursor: null,
  loading: false,
  error: false,
};

export default function DevicesPage() {
  const api = useApiClient();
  const [state, setState] = useState<ListState>(INITIAL_STATE);

  const load = useCallback(
    async (nextCursor: string | null) => {
      setState((prev) => ({ ...prev, loading: true, error: false }));
      try {
        const query = nextCursor
          ? `/api/devices?mine=1&limit=25&cursor=${encodeURIComponent(nextCursor)}`
          : "/api/devices?mine=1&limit=25";
        const payload = await api.get<DeviceListResponse>(query);
        setState((prev) => ({
          items: nextCursor ? prev.items.concat(payload.items ?? []) : payload.items ?? [],
          cursor: payload.next ?? null,
          loading: false,
          error: false,
        }));
      } catch {
        setState((prev) => ({ ...prev, loading: false, error: true }));
      }
    },
    [api],
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  const { items, cursor, loading, error } = state;

  return (
    <Page title="Devices">
      <div className="card">
        <div className="card-header">
          <div className="card-title">Devices in scope</div>
          {error ? <span className="pill error">Error fetching list</span> : null}
        </div>
        {items.length ? (
          <div className="min-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Site</th>
                  <th>Status</th>
                  <th>Last seen</th>
                  <th>Profile</th>
                </tr>
              </thead>
              <tbody>
                {items.map((device) => (
                  <tr key={device.lookup}>
                    <td>
                      <a className="link" href={`/app/device?device=${encodeURIComponent(device.lookup)}`}>
                        {device.device_id}
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
                    <td>{device.profile_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">{loading ? "Loading..." : "No devices"}</div>
        )}
        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="subdued">{cursor ? "More devices available" : "End of list"}</div>
          {cursor ? (
            <button
              type="button"
              className="btn"
              disabled={loading}
              onClick={() => {
                void load(cursor);
              }}
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          ) : null}
        </div>
      </div>
    </Page>
  );
}

