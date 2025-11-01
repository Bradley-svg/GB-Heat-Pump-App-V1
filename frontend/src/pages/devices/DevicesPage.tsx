import { useCallback, useEffect, useMemo, useState } from "react";

import { useApiClient, useCurrentUserState } from "../../app/contexts";
import { Page } from "../../components";
import { formatRelative } from "../../utils/format";
import type { DeviceListItem, DeviceListResponse } from "../../types/api";

interface ListState {
  items: DeviceListItem[];
  cursor: string | null;
  loading: boolean;
  error: boolean;
}

const INITIAL_STATE: ListState = {
  items: [],
  cursor: null,
  loading: false,
  error: false,
};

export default function DevicesPage() {
  const api = useApiClient();
  const currentUser = useCurrentUserState();
  const user = currentUser.user;
  const isAdmin = useMemo(
    () => (user?.roles ?? []).some((role) => role.toLowerCase() === "admin"),
    [user?.roles],
  );
  const [mineOnly, setMineOnly] = useState<boolean>(() => !isAdmin);
  const [state, setState] = useState<ListState>(INITIAL_STATE);

  const scopeMine = isAdmin ? mineOnly : true;

  const load = useCallback(
    async (nextCursor: string | null, reset = false) => {
      setState((prev) => ({
        items: reset ? [] : prev.items,
        cursor: reset ? null : prev.cursor,
        loading: true,
        error: false,
      }));
      try {
        const params = new URLSearchParams({
          limit: "25",
          mine: scopeMine ? "1" : "0",
        });
        if (nextCursor) {
          params.set("cursor", nextCursor);
        }
        const payload = await api.get<DeviceListResponse>(`/api/devices?${params.toString()}`);
        const items = payload.items ?? [];
        setState((prev) => ({
          items: nextCursor && !reset ? prev.items.concat(items) : items,
          cursor: payload.next ?? null,
          loading: false,
          error: false,
        }));
      } catch {
        setState((prev) => ({ ...prev, loading: false, error: true }));
      }
    },
    [api, scopeMine],
  );

  useEffect(() => {
    void load(null, true);
  }, [load]);

  const { items, cursor, loading, error } = state;

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

  return (
    <Page title="Devices" actions={actions}>
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
                    <td>{device.site ?? "-"}</td>
                    <td>
                      <span
                        className={`status-dot${device.online ? " ok" : ""}`}
                        title={device.online ? "Online" : "Offline"}
                      />
                    </td>
                    <td>{formatRelative(device.last_seen_at)}</td>
                    <td>{device.profile_id ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">{loading ? "Loading..." : "No devices"}</div>
        )}
        <div className="flex-between mt-1">
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
