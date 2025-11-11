import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { ModeARNClient, type DashboardSnapshot } from "@greenbro/sdk-rn";
import { ThemeProvider, GBButton, GBCard, GBStatusPill } from "@greenbro/ui-rn";
import { sampleSnapshot } from "./src/sampleData";

const client = new ModeARNClient({
  apiBase: process.env.EXPO_PUBLIC_APP_API_BASE ?? "https://api-overseas.example.com",
});

export default function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(sampleSnapshot);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    async function load() {
      try {
        const data = await client.getDashboardSnapshot();
        setSnapshot(data);
        setNotice(undefined);
      } catch (error) {
        console.warn("mobile: fallback to sample data", error);
        setNotice("Offline mode · showing cached sample data.");
      }
    }
    load();
  }, []);

  const primaryDevice = snapshot.top_devices[0];

  return (
    <ThemeProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: "700" }}>Mode A Mobile</Text>
          <Text>Identifiers are pseudonymous. Contact CN ops for re-identification.</Text>

          {notice && (
            <GBCard title="Status">
              <Text>{notice}</Text>
            </GBCard>
          )}

          <GBCard title="Latest Device">
            {primaryDevice ? (
              <View style={{ gap: 8 }}>
                <Text>Pseudo ID: {primaryDevice.device_id}</Text>
                <Text>Supply: {formatMaybe(primaryDevice.supplyC)} °C</Text>
                <Text>Return: {formatMaybe(primaryDevice.returnC)} °C</Text>
                <Text>COP: {formatMaybe(primaryDevice.cop)}</Text>
                <Text>Site: {primaryDevice.site ?? "Unassigned"}</Text>
              </View>
            ) : (
              <Text>No recent telemetry in scope.</Text>
            )}
            <GBButton label="Request Diagnostics" onPress={() => console.log("diag")} />
          </GBCard>

          <GBCard title="Alerts">
            {snapshot.alerts.length === 0 && <Text>All clear.</Text>}
            {snapshot.alerts.map((alert) => (
              <View key={`${alert.lookup}-${alert.ts}`} style={{ marginBottom: 8, gap: 4 }}>
                <GBStatusPill status={alert.fault_count > 0 ? "ALERT" : "WARN"} label={alert.device_id} />
                <Text>{alert.faults.join(", ") || "Fault cleared"}</Text>
                <Text>{new Date(alert.ts).toLocaleString()}</Text>
              </View>
            ))}
          </GBCard>
        </ScrollView>
      </SafeAreaView>
    </ThemeProvider>
  );
}

function formatMaybe(value: number | null | undefined) {
  if (value == null) return "--";
  return value.toFixed(1);
}
