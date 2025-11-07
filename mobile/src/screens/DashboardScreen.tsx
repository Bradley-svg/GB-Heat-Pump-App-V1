import React, { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { GBStatusPill } from "../components/GBStatusPill";
import { GBKpiTile } from "../components/GBKpiTile";
import { GBButton } from "../components/GBButton";
import { GBListItem } from "../components/GBListItem";
import { useTheme } from "../theme/GBThemeProvider";
import { useHaptics } from "../hooks/useHaptics";

export const DashboardScreen: React.FC<{ onShowToast: (message: string, type: "success" | "warn" | "error") => void }> =
  ({ onShowToast }) => {
    const { spacing, colors } = useTheme();
    const haptic = useHaptics();
    const [ctaPressed, setCtaPressed] = useState(false);

    const handleCommission = () => {
      setCtaPressed(true);
      void haptic("impact");
      onShowToast("Commissioning workflow created", "success");
    };

    const handleAlertsLink = () => {
      void haptic("warning");
      onShowToast("Opening alerts…", "warn");
      void Linking.openURL("greenbro://alerts").catch(() => undefined);
    };

    return (
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        accessibilityRole="scrollbar"
        testID="dashboard-scroll"
      >
        <View style={{ marginBottom: spacing.lg }}>
          <GBStatusPill label="Fleet Stable" status="good" />
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.text, marginTop: spacing.md }}>
            Good afternoon, GreenBro Ops
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: spacing.xs }}>
            System health nominal. Tap into Alerts for latest notifications.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <GBKpiTile label="Outlet Temp" value="48.2" unit="°C" delta={0.8} />
          <GBKpiTile label="COP" value="4.6" unit="" delta={-0.2} />
          <GBKpiTile label="Energy Today" value="312" unit="kWh" delta={10} />
        </ScrollView>

        <View style={{ marginTop: spacing.xl }}>
          <GBButton
            label={ctaPressed ? "Commissioning Started" : "Start Commissioning"}
            onPress={handleCommission}
            accessibilityHint="Creates a new commissioning workflow"
          />
          <View style={{ height: spacing.sm }} />
          <GBButton
            label="View Alerts"
            variant="ghost"
            leadingIcon={<Text style={{ color: colors.primary }}>⚠️</Text>}
            onPress={handleAlertsLink}
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Text style={{ color: colors.textMuted, fontWeight: "600", marginBottom: spacing.sm }}>
            Quick Links
          </Text>
          <GBListItem title="Fleet Overview" subtitle="Performance snapshots" rightAccessory="chevron" />
          <GBListItem title="High Priority Alerts" subtitle="3 open issues" rightAccessory="badge" badgeLabel="3" />
        </View>
      </ScrollView>
    );
  };
