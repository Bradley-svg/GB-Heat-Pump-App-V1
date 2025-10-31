import { useEffect, useState } from "react";

import { useApiClient } from "../../app/contexts";
import { Page } from "../../components";
import { formatNumber, formatRelative } from "../../utils/format";
import type { CommissioningChecklistItem, CommissioningDevice, CommissioningResponse } from "../../types/api";

type AsyncState = "loading" | "error" | "ready";

type EnrichedDevice = CommissioningDevice & {
  checklist: CommissioningChecklistItem[];
  progress: number;
};

interface CommissioningState {
  summary: CommissioningResponse["summary"];
  devices: EnrichedDevice[];
}

export default function CommissioningPage() {
  const api = useApiClient();
  const [state, setState] = useState<AsyncState>("loading");
  const [data, setData] = useState<CommissioningState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    api
      .get<CommissioningResponse>("/api/commissioning/checklist", { signal: controller.signal })
      .then((payload) => {
        const devices = (payload.devices ?? []).map(enrichDevice);
        setData({ summary: payload.summary, devices });
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
      <Page title="Commissioning & QA">
        <div className="card">Loading...</div>
      </Page>
    );
  }

  if (state === "error" || !data) {
    return (
      <Page title="Commissioning & QA">
        <div className="card callout error">Unable to load commissioning status</div>
      </Page>
    );
  }

  const { summary, devices } = data;
  const completionPct = summary.total ? Math.round(((summary.ready ?? 0) / summary.total) * 100) : 0;

  return (
    <Page title="Commissioning & QA">
      <div className="card">
        <div className="card-header">
          <div className="card-title">Readiness overview</div>
          <span className="pill">
            {summary.ready} ready of {summary.total}
          </span>
        </div>
        <div className="callout mt-06">
          {summary.total ? `${completionPct}% checklist complete across fleet` : "No devices in scope"}
        </div>
      </div>
      <div className="stack mt-1">
        {devices.map((device) => (
          <div className="card" key={device.lookup}>
            <div className="card-header">
              <div>
                <div className="card-title">{device.device_id}</div>
                {device.site ? <div className="subdued">{device.site}</div> : null}
              </div>
              <span className={`pill${device.progress >= 0.86 ? "" : " warn"}`}>
                {formatNumber(device.progress * 100, 0)}%
              </span>
            </div>
            <div className="subdued">
              Last heartbeat {formatRelative(device.last_seen_at ?? device.updated_at)}
            </div>
            <progress className="progress-bar" max={100} value={Math.round(device.progress * 100)} />
            <div className="checklist">
              {device.checklist.map((item) => (
                <div className={`check-item${item.pass ? "" : " fail"}`} key={item.key}>
                  <span>{item.label}</span>
                  <span className="subdued">{item.detail}</span>
                </div>
              ))}
            </div>
            <div className="mt-06">
              <a href={`/app/device?device=${encodeURIComponent(device.lookup)}`} className="link">
                Open device
              </a>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function enrichDevice(device: CommissioningDevice): EnrichedDevice {
  const checklist = buildChecklist(device);
  const passed = checklist.filter((item) => item.pass).length;
  const progress = checklist.length ? passed / checklist.length : 0;
  return {
    ...device,
    checklist,
    progress,
  };
}

function buildChecklist(device: CommissioningDevice): CommissioningChecklistItem[] {
  const items: CommissioningChecklistItem[] = [];
  items.push({
    key: "online",
    label: "Device online",
    detail: device.online ? "Heartbeat received" : "Waiting for heartbeat",
    pass: device.online,
  });
  items.push({
    key: "flow",
    label: "Flow sensor reporting",
    detail: device.flowLps !== null ? `${formatNumber(device.flowLps, 2)} L/s` : "No flow telemetry yet",
    pass: typeof device.flowLps === "number",
  });
  items.push({
    key: "delta",
    label: "\u0394T above 3\u00B0C",
    detail:
      device.deltaT !== null
        ? `${formatNumber(device.deltaT, 1)} \u00B0C`
        : "\u0394T unavailable",
    pass: typeof device.deltaT === "number" && device.deltaT >= 3,
  });
  items.push({
    key: "thermal",
    label: "Thermal output reported",
    detail: device.thermalKW !== null ? `${formatNumber(device.thermalKW, 2)} kW` : "No thermal telemetry",
    pass: typeof device.thermalKW === "number",
  });
  items.push({
    key: "mode",
    label: "Operating mode detected",
    detail: device.mode ?? "Mode unknown",
    pass: Boolean(device.mode),
  });
  return items;
}
