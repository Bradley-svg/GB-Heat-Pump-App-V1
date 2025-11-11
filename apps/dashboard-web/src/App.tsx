import { useCallback, useEffect, useMemo, useState } from "react";
import { ModeAWebClient, type DashboardSnapshot } from "@greenbro/sdk-web";
import { ThemeProvider, GBButton, GBCard, GBKpiTile, GBListItem, GBStatusPill } from "@greenbro/ui-react";
import { sampleSnapshot } from "./sampleData";

const client = new ModeAWebClient({
  apiBase: import.meta.env.VITE_APP_API_BASE ?? "/api",
});

export default function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(sampleSnapshot);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [notice, setNotice] = useState<string>();

  const fetchSnapshot = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await client.getDashboardSnapshot();
      setSnapshot(data);
      setStatus("idle");
      setNotice(undefined);
    } catch (error) {
      console.warn("dashboard: fallback to sample data", error);
      setStatus("error");
      setNotice("Showing cached sample data while the API is unreachable.");
      setSnapshot((current) => current); // keep previous snapshot (sample by default)
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const topDevices = snapshot.top_devices;
  const alerts = snapshot.alerts;

  const fleetStats = useMemo(() => {
    const supplyValues = topDevices.map((d) => d.supplyC).filter((value): value is number => value != null);
    const avgSupply = supplyValues.length
      ? (supplyValues.reduce((sum, value) => sum + value, 0) / supplyValues.length).toFixed(1)
      : "--";
    const copValues = topDevices.map((d) => d.cop).filter((value): value is number => value != null);
    const avgCop = copValues.length
      ? (copValues.reduce((sum, value) => sum + value, 0) / copValues.length).toFixed(2)
      : snapshot.kpis.avg_cop?.toFixed(2) ?? "--";
    return {
      avgCop,
      avgSupply,
      fleetSize: snapshot.kpis.devices_total,
      onlineRate: `${snapshot.kpis.online_pct.toFixed(1)}%`,
      openAlerts: snapshot.kpis.open_alerts,
    };
  }, [snapshot, topDevices]);

  const statusMessage =
    status === "loading" ? "Loading latest telemetry..." : status === "error" ? "Live data unavailable. Showing snapshot." : undefined;

  return (
    <ThemeProvider>
      <main style={{ padding: 32, fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0 }}>Mode A Operations</h1>
            <p style={{ margin: 0, color: "#666" }}>Identifiers displayed are pseudonymous. Contact CN ops for re-identification.</p>
          </div>
          <GBButton variant="secondary" onClick={() => fetchSnapshot()}>
            Refresh
          </GBButton>
        </header>

        {notice && (
          <GBCard title="Status">
            <p>{notice}</p>
          </GBCard>
        )}

        {statusMessage && <p>{statusMessage}</p>}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <GBKpiTile label="Fleet Size" value={String(fleetStats.fleetSize)} trend="flat" />
          <GBKpiTile label="Online Rate" value={fleetStats.onlineRate} trend="up" />
          <GBKpiTile label="Avg COP" value={fleetStats.avgCop} trend="flat" />
          <GBKpiTile label="Avg Supply (°C)" value={fleetStats.avgSupply} trend="flat" />
          <GBKpiTile label="Open Alerts" value={String(fleetStats.openAlerts)} trend={fleetStats.openAlerts > 0 ? "down" : "flat"} />
        </section>

        <section style={{ marginTop: 32, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          <GBCard title="Devices">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topDevices.length === 0 && <p>No recent devices in scope.</p>}
              {topDevices.map((device) => (
                <GBListItem
                  key={device.lookup}
                  title={device.device_id}
                  subtitle={`Supply ${formatMaybe(device.supplyC)} °C | Return ${formatMaybe(device.returnC)} °C`}
                  meta={device.site ?? "Unassigned"}
                />
              ))}
            </div>
          </GBCard>

          <GBCard title="Alerts">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.length === 0 && <p>All clear.</p>}
              {alerts.map((alert) => (
                <div key={`${alert.lookup}-${alert.ts}`} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <GBStatusPill status={alert.fault_count > 0 ? "ALERT" : "WARN"} label={alert.device_id} />
                  <small>{alert.faults.join(", ") || "Fault cleared"}</small>
                  <small style={{ color: "#777" }}>{new Date(alert.ts).toLocaleString()}</small>
                </div>
              ))}
            </div>
          </GBCard>
        </section>
      </main>
    </ThemeProvider>
  );
}

function formatMaybe(value: number | null) {
  if (value == null) return "--";
  return value.toFixed(1);
}
