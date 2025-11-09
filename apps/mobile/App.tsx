import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { ModeARNClient } from "@greenbro/sdk-rn";
import { ThemeProvider, GBButton, GBCard, GBStatusPill } from "@greenbro/ui-rn";
import { sampleAlerts, sampleDevice } from "./src/sampleData";

const client = new ModeARNClient({
  apiBase: process.env.EXPO_PUBLIC_APP_API_BASE ?? "https://api-overseas.example.com",
});

export default function App() {
  const [device, setDevice] = useState(sampleDevice);
  const [alerts, setAlerts] = useState(sampleAlerts);
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function load() {
      try {
        const [devices, alertsResp] = await Promise.all([client.getDevices(), client.getAlerts()]);
        if (devices.length) setDevice(devices[0]);
        setAlerts(alertsResp);
      } catch (err) {
        console.warn("Mobile fallback to sample data", err);
        setError("Offline mode");
      }
    }
    load();
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: "700" }}>Mode A Mobile</Text>
          <Text>Identifiers are pseudonymous. Contact CN ops for re-identification.</Text>

          {error && (
            <GBCard title="Status">
              <Text>{error}</Text>
            </GBCard>
          )}

          <GBCard title="Latest Device">
            <View style={{ gap: 8 }}>
              <Text>Pseudo ID: {device.didPseudo}</Text>
              <Text>Supply: {device.latest?.supplyC ?? "--"} C</Text>
              <Text>Return: {device.latest?.returnC ?? "--"} C</Text>
              <Text>COP: {device.latest?.COP ?? "--"}</Text>
            </View>
            <GBButton label="Request Diagnostics" onPress={() => console.log("diag")} />
          </GBCard>

          <GBCard title="Alerts">
            {alerts.map((alert) => (
              <View key={alert.id} style={{ marginBottom: 8, gap: 4 }}>
                <GBStatusPill status={alert.severity === "HIGH" ? "ALERT" : "WARN"} label={alert.alert_type} />
                <Text>{alert.message}</Text>
                <Text>{new Date(alert.raised_at).toLocaleString()}</Text>
              </View>
            ))}
          </GBCard>
        </ScrollView>
      </SafeAreaView>
    </ThemeProvider>
  );
}
