import { useEffect, useMemo, useState } from "react";
import { ModeAWebClient } from "@greenbro/sdk-web";
import { ThemeProvider, GBCard, GBKpiTile, GBListItem, GBStatusPill, GBButton } from "@greenbro/ui-react";
import type { Device } from "@greenbro/sdk-core";
import { sampleDevices, sampleAlerts } from "./sampleData";

interface Alert {
  id: string;
  didPseudo: string;
  alert_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  raised_at: string;
}

const client = new ModeAWebClient({
  apiBase: import.meta.env.VITE_APP_API_BASE ?? "/api",
});

export default function App() {
  const [devices, setDevices] = useState<Device[]>(sampleDevices);
  const [alerts, setAlerts] = useState<Alert[]>(sampleAlerts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!import.meta.env.VITE_APP_API_BASE) return;
      setLoading(true);
      try {
        const [deviceResp, alertResp] = await Promise.all([client.getDevices(), client.getAlerts()]);
        if (mounted) {
          setDevices(deviceResp);
          setAlerts(alertResp);
        }
      } catch (err) {
        console.warn("Falling back to sample data", err);
        setError("Unable to reach API, showing sample data");
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const fleetStats = useMemo(() => {
    const count = devices.length || 1;
    const avgCop =
      devices.reduce((sum, d) => sum + (d.latest?.COP ?? 0), 0) / count;
    const avgSupply =
      devices.reduce((sum, d) => sum + (d.latest?.supplyC ?? 0), 0) / count;
    return { avgCop: avgCop.toFixed(2), avgSupply: avgSupply.toFixed(1), fleetSize: devices.length };
  }, [devices]);

  return (
    <ThemeProvider>
      <main style={{ padding: 32, fontFamily: "Inter, system-ui, sans-serif", maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0 }}>Mode A Operations</h1>
            <p style={{ margin: 0, color: "#666" }}>Identifiers displayed are pseudonymous. Contact CN ops for re-identification.</p>
          </div>
          <GBButton variant="secondary" onClick={() => window.location.reload()}>
            Refresh
          </GBButton>
        </header>

        {error && (
          <GBCard title="API Notice">
            <p>{error}</p>
          </GBCard>
        )}

        {loading && <p>Loading latest telemetry...</p>}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <GBKpiTile label="Fleet Size" value={String(fleetStats.fleetSize)} trend="flat" />
          <GBKpiTile label="Avg COP" value={fleetStats.avgCop} trend="up" />
          <GBKpiTile label="Avg Supply (C)" value={fleetStats.avgSupply} trend="flat" />
        </section>

        <section style={{ marginTop: 32, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          <GBCard title="Devices">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {devices.map((device) => (
                <GBListItem
                  key={device.didPseudo}
                  title={device.didPseudo}
                  subtitle={`Supply ${device.latest?.supplyC ?? "--"} C | Return ${device.latest?.returnC ?? "--"} C`}
                  meta={new Date(device.latest?.timestamp_minute ?? Date.now()).toLocaleTimeString()}
                />
              ))}
            </div>
          </GBCard>

          <GBCard title="Alerts">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.length === 0 && <p>All clear.</p>}
              {alerts.map((alert) => (
                <div key={alert.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <GBStatusPill status={alert.severity === "HIGH" || alert.severity === "CRITICAL" ? "ALERT" : "WARN"} label={alert.alert_type} />
                  <small>{alert.message}</small>
                  <small style={{ color: "#777" }}>{new Date(alert.raised_at).toLocaleString()}</small>
                </div>
              ))}
            </div>
          </GBCard>
        </section>
      </main>
    </ThemeProvider>
  );
}
