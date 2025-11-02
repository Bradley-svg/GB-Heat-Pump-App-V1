import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useApiClient } from "../../app/contexts";
import { Page } from "../../components";
import { formatNumber, formatRelative } from "../../utils/format";
import type { AlertsFeedItem, AlertsFeedResponse } from "../../types/api";

type AsyncState = "loading" | "error" | "ready";

export default function AlertsPage() {
  const api = useApiClient();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<AlertsFeedResponse | null>(null);
  const [state, setState] = useState<AsyncState>("loading");

  const queryHours = searchParams.get("hours") ?? undefined;

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    const query = new URLSearchParams();
    if (queryHours) query.set("hours", queryHours);
    const params = query.toString();
    const path = params ? "/api/alerts/recent?" + params : "/api/alerts/recent";
    api
      .get<AlertsFeedResponse>(path, { signal: controller.signal })
      .then((payload) => {
        setData(payload);
        setState("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
      });
    return () => controller.abort();
  }, [api, queryHours]);

  const windowLabel = useMemo(() => (queryHours ? `${queryHours}h` : "72h"), [queryHours]);

  if (state === "loading") {
    return (
      <Page title="Alerts">
        <div className="card">Loading...</div>
      </Page>
    );
  }

  if (state === "error" || !data) {
    return (
      <Page title="Alerts">
        <div className="card callout error">Unable to load alerts</div>
      </Page>
    );
  }

  return (
    <Page title="Alerts">
      <div className="grid kpis">
        <div className="card tight">
          <div className="muted">Total alerts</div>
          <div className="large-number">{formatNumber(data.stats?.total ?? 0, 0)}</div>
        </div>
        <div className="card tight">
          <div className="muted">Active now</div>
          <div className="large-number">{formatNumber(data.stats?.active ?? 0, 0)}</div>
        </div>
        <div className="card tight">
          <div className="muted">Window</div>
          <div className="large-number">Last {windowLabel}</div>
        </div>
      </div>

      <div className="stack">
        {data.items?.length ? (
          data.items.map((alert) => <AlertCard key={alert.lookup} alert={alert} />)
        ) : (
          <div className="card">
            <div className="empty">No alerts during this window</div>
          </div>
        )}
      </div>
    </Page>
  );
}

interface AlertCardProps {
  alert: AlertsFeedItem;
}

function AlertCard({ alert }: AlertCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{alert.device_id}</div>
          {alert.site ? <div className="subdued">{alert.site}</div> : null}
        </div>
        <span className={`pill${alert.active ? " warn" : ""}`}>{alert.active ? "Active" : "Cleared"}</span>
      </div>
      <div className="list">
        <div className="list-item">
          <div>
            <div>{alert.faults?.join(", ") || "Fault reported"}</div>
            <div className="meta">Triggered {formatRelative(alert.ts)}</div>
          </div>
          <div className="text-right">
            <div className="meta">
              {alert.last_update ? `Last update ${formatRelative(alert.last_update)}` : "No recent update"}
            </div>
            <Link to={`/device?device=${encodeURIComponent(alert.lookup)}`} className="link inline-link">
              Inspect device
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
