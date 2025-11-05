import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useApiClient } from "../../app/contexts";
import { Page } from "../../components";
import { formatDate, formatNumber } from "../../utils/format";
import type { AdminOverviewResponse } from "../../types/api";

type AsyncState = "loading" | "error" | "ready";

export default function AdminPage() {
  const api = useApiClient();
  const [state, setState] = useState<AsyncState>("loading");
  const [data, setData] = useState<AdminOverviewResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    api
      .get<AdminOverviewResponse>("/api/fleet/admin-overview", {
        signal: controller.signal,
      })
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
      <Page title="Admin">
        <div className="card">Loading...</div>
      </Page>
    );
  }

  if (state === "error" || !data) {
    return (
      <Page title="Admin">
        <div className="card callout error">Unable to load admin overview</div>
      </Page>
    );
  }

  const statusMix = getStatusMix(data.ops_summary);
  const windowDescriptor =
    data.ops_window ?
      `Window: last ${formatNumber(data.ops_window.days, 0)} days (since ${formatDate(data.ops_window.start)})` :
      null;

  return (
    <Page title="Admin">
      <div className="card">
        <div className="card-header">
          <div className="card-title">Tenants</div>
          <span className="pill">{data.tenants?.length ?? 0} profiles</span>
        </div>
        {data.tenants?.length ? (
          <div className="min-table">
            <table className="table" aria-label="Tenant inventory">
              <thead>
                <tr>
                  <th scope="col">Profile</th>
                  <th scope="col">Devices</th>
                  <th scope="col">Online</th>
                </tr>
              </thead>
              <tbody>
                {data.tenants.map((tenant) => (
                  <tr key={tenant.profile_id}>
                    <td>{tenant.profile_id}</td>
                    <td>{formatNumber(tenant.device_count ?? 0, 0)}</td>
                    <td>{formatNumber(tenant.online_count ?? 0, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No tenant data</div>
        )}
      </div>

      <div className="card mt-1">
        <div className="card-header">
          <div className="card-title">Recent operations</div>
          <span className="pill">{data.ops?.length ?? 0} events</span>
        </div>
        {data.ops?.length ? (
          <div className="min-table">
            <table className="table" aria-label="Recent operations">
              <thead>
                <tr>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Route</th>
                  <th scope="col">Status</th>
                  <th scope="col">Duration ms</th>
                  <th scope="col">Device</th>
                </tr>
              </thead>
              <tbody>
                {data.ops.map((row, index) => (
                  <tr key={`${row.ts}-${index}`}>
                    <td>{formatDate(row.ts)}</td>
                    <td>{row.route}</td>
                    <td>{row.status_code}</td>
                    <td>{row.duration_ms}</td>
                    <td>
                      {row.device_id && row.lookup ? (
                        <Link className="link" to={`/device?device=${encodeURIComponent(row.lookup)}`}>
                          {row.device_id}
                        </Link>
                      ) : row.device_id ?? (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No recent operations in scope</div>
        )}
        <div className="subdued mt-06">Status mix: {statusMix}</div>
        {windowDescriptor ? <div className="subdued">{windowDescriptor}</div> : null}
      </div>
    </Page>
  );
}

function getStatusMix(summary: AdminOverviewResponse["ops_summary"]): string {
  if (!summary) return "n/a";
  const entries = Object.entries(summary);
  if (!entries.length) return "n/a";
  return entries.map(([status, count]) => `${status}: ${formatNumber(count, 0)}`).join(" | ");
}
