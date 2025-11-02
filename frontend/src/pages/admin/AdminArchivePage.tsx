import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useApiClient } from "../../app/contexts";
import { Page } from "../../components";
import { formatNumber, formatRelative } from "../../utils/format";
import type { ArchiveResponse } from "../../types/api";

type AsyncState = "loading" | "error" | "ready";

export default function AdminArchivePage() {
  const api = useApiClient();
  const [state, setState] = useState<AsyncState>("loading");
  const [data, setData] = useState<ArchiveResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    api
      .get<ArchiveResponse>("/api/archive/offline", { signal: controller.signal })
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
      <Page title="Archive">
        <div className="card">Loading...</div>
      </Page>
    );
  }

  if (state === "error" || !data) {
    return (
      <Page title="Archive">
        <div className="card callout error">Unable to load archive data</div>
      </Page>
    );
  }

  return (
    <Page title="Archive">
      <div className="card">
        <div className="card-header">
          <div className="card-title">Offline devices</div>
          <span className="pill">{data.offline?.length ?? 0} entries</span>
        </div>
        {data.offline?.length ? (
          <div className="stack">
            {data.offline.map((row) => (
              <div className="list-item" key={row.lookup}>
                <div>
                  <div className="font-semibold">{row.device_id}</div>
                  {row.site ? <div className="subdued">{row.site}</div> : null}
                  <div className="meta">Last heartbeat {formatRelative(row.last_seen_at)}</div>
                </div>
                <div className="text-right">
                  <div className="meta">Alerts {row.alerts}</div>
                  <Link to={`/device?device=${encodeURIComponent(row.lookup)}`} className="link">
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No offline devices found</div>
        )}
      </div>

      <div className="card mt-1">
        <div className="card-header">
          <div className="card-title">Telemetry archive volume</div>
        </div>
        {data.history?.length ? (
          <div className="history-grid">
            {data.history.map((row, index) => (
              <div className="history-card" key={`${row.day}-${index}`}>
                <strong>{row.day}</strong>
                <div className="subdued">{formatNumber(row.samples ?? 0, 0)} samples</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No recent telemetry samples</div>
        )}
      </div>
    </Page>
  );
}
