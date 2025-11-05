import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

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
  const mountedRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const load = useCallback(
    async (nextCursor: string | null, reset = false) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
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
        const payload = await api.get<DeviceListResponse>(`/api/devices?${params.toString()}`, {
          signal: controller.signal,
        });
        const items = payload.items ?? [];
        if (!mountedRef.current || controller.signal.aborted) {
          if (controllerRef.current === controller) {
            controllerRef.current = null;
          }
          return;
        }
        setState((prev) => ({
          items: nextCursor && !reset ? prev.items.concat(items) : items,
          cursor: payload.next ?? null,
          loading: false,
          error: false,
        }));
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      } catch {
        if (!mountedRef.current || controller.signal.aborted) {
          if (controllerRef.current === controller) {
            controllerRef.current = null;
          }
          return;
        }
        setState((prev) => ({ ...prev, loading: false, error: true }));
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
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
            <table className="table" aria-label="Devices in scope">
              <thead>
                <tr>
                  <th scope="col">Device</th>
                  <th scope="col">Site</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last seen</th>
                  <th scope="col">Profile</th>
                </tr>
              </thead>
              <tbody>
                {items.map((device) => (
                  <tr key={device.lookup}>
                    <td>
                      <Link className="link" to={`/device?device=${encodeURIComponent(device.lookup)}`}>
                        {device.device_id}
                      </Link>
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
