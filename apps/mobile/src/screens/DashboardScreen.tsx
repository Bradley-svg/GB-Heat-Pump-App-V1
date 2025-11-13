import { MaterialIcons as MaterialIconsBase } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GBButton } from "../components/GBButton";
import { GBCard } from "../components/GBCard";
import { GBKpiTile } from "../components/GBKpiTile";
import { GBListItem } from "../components/GBListItem";
import { GBStatusPill } from "../components/GBStatusPill";
import { useAuth } from "../contexts/AuthContext";
import {
  useFleetSummary,
  type FleetSummaryResult,
} from "../hooks/useFleetSummary";
import { useHaptics } from "../hooks/useHaptics";
import type { RootTabsParamList } from "../navigation/AppNavigator";
import { useTheme } from "../theme/GBThemeProvider";

interface DashboardScreenProps {
  onShowToast: (message: string, type: "success" | "warn" | "error") => void;
}

type DashboardScreenNavProps = BottomTabScreenProps<
  RootTabsParamList,
  "Dashboard"
>;
type DashboardProps = DashboardScreenProps & DashboardScreenNavProps;

type DashboardKpi = {
  label: string;
  value: string;
  unit?: string;
  delta?: number;
};
type ThemeSpacing = ReturnType<typeof useTheme>["spacing"];
type ThemeColors = ReturnType<typeof useTheme>["colors"];

export const DashboardScreen: React.FC<DashboardProps> = ({
  onShowToast,
  navigation,
}) => {
  const { spacing, colors } = useTheme();
  const { logout } = useAuth();
  const haptic = useHaptics();
  const [ctaPressed, setCtaPressed] = useState(false);
  const { data, status, error, refresh } = useFleetSummary({
    hours: 24,
    lowDeltaT: 2,
  });
  const themedStyles = useMemo(
    () => createStyles(spacing, colors),
    [colors, spacing],
  );

  const kpis = useMemo(() => deriveKpis(data), [data]);
  const refreshing = status === "loading" && Boolean(data);

  const handleCommission = () => {
    setCtaPressed(true);
    void haptic("impact");
    onShowToast("Commissioning workflow created", "success");
  };

  const handleAlertsLink = useCallback(() => {
    void haptic("warning");
    navigation.navigate("Alerts");
    onShowToast("Opening alerts...", "warn");
  }, [haptic, navigation, onShowToast]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      onShowToast("Signed out", "success");
    } catch {
      onShowToast("Unable to sign out. Try again.", "error");
    }
  }, [logout, onShowToast]);

  if (!data && status === "loading") {
    return (
      <View style={themedStyles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={themedStyles.scrollContent}
      refreshControl={
        <RefreshControl
          tintColor={colors.primary}
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[colors.primary]}
        />
      }
      accessibilityRole="scrollbar"
      testID="dashboard-scroll"
    >
      <View style={themedStyles.header}>
        <GBStatusPill
          label={
            data
              ? `Fleet ${Math.round(data.kpis.online_pct)}% Online`
              : "Fleet status unavailable"
          }
          status={data && data.kpis.online_pct > 80 ? "good" : "warn"}
        />
        <Text style={themedStyles.greeting}>Good afternoon, GreenBro Ops</Text>
        <Text style={themedStyles.subText}>
          {error
            ? "We could not load the latest metrics."
            : "Telemetry synced from the last 24h window."}
        </Text>
      </View>

      {status === "error" ? (
        <GBCard title="Unable to load fleet metrics" tone="error">
          <Text style={{ color: colors.textMuted }}>
            {error?.message ?? "An unexpected error occurred."}
          </Text>
          <View style={themedStyles.spacerSm} />
          <GBButton label="Retry" onPress={refresh} />
        </GBCard>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {kpis.map((kpi) => (
          <GBKpiTile
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            unit={kpi.unit}
            delta={kpi.delta}
          />
        ))}
      </ScrollView>

      <View style={themedStyles.ctaSection}>
        <GBButton
          label={ctaPressed ? "Commissioning Started" : "Start Commissioning"}
          onPress={handleCommission}
          accessibilityHint="Creates a new commissioning workflow"
        />
        <View style={themedStyles.spacerSm} />
        <GBButton
          label="View Alerts"
          variant="ghost"
          leadingIcon={
            <MaterialIcon
              name="notifications-active"
              size={20}
              color={colors.primary}
              accessibilityElementsHidden
            />
          }
          onPress={handleAlertsLink}
        />
      </View>

      <View style={themedStyles.quickLinks}>
        <Text style={themedStyles.quickLinksLabel}>Quick Links</Text>
        <GBListItem
          title="Fleet Overview"
          subtitle="Performance snapshots"
          rightAccessory="chevron"
        />
        <GBListItem
          title="High Priority Alerts"
          subtitle={`${data?.kpis.open_alerts ?? 0} open issues`}
          rightAccessory="badge"
          badgeLabel={String(data?.kpis.open_alerts ?? 0)}
        />
        <GBListItem
          title="Sign out"
          subtitle="Return to login"
          rightAccessory="chevron"
          onPress={handleLogout}
          testID="quicklink-logout"
        />
      </View>
    </ScrollView>
  );
};

function formatNumber(
  value: number | null | undefined,
  fractionDigits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return Number(value).toFixed(fractionDigits);
}

function deriveKpis(data: FleetSummaryResult["data"]): DashboardKpi[] {
  if (!data) {
    return [
      { label: "Outlet Temp", value: "--", unit: "°C" },
      { label: "COP", value: "--" },
      { label: "Thermal Output (kW)", value: "--", unit: "kW" },
    ];
  }

  const latestTrend = data.trend[data.trend.length - 1];
  const primaryDevice = data.top_devices[0];
  const outletTemp = primaryDevice?.supplyC ?? null;
  const fallbackOutlet = outletTemp ?? primaryDevice?.deltaT ?? null;

  return [
    {
      label: "Outlet Temp",
      value: formatNumber(fallbackOutlet, 1),
      unit: "°C",
      delta: undefined,
    },
    {
      label: "COP",
      value: formatNumber(data.kpis.avg_cop),
      unit: "",
      delta: undefined,
    },
    {
      label: "Thermal Output (kW)",
      value: formatNumber(latestTrend?.thermalKW ?? null, 1),
      unit: "kW",
      delta: undefined,
    },
  ];
}

const createStyles = (spacing: ThemeSpacing, colors: ThemeColors) =>
  StyleSheet.create({
    scrollContent: { padding: spacing.lg },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    header: { marginBottom: spacing.lg },
    greeting: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: colors.text,
      marginTop: spacing.md,
    },
    subText: {
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    ctaSection: { marginTop: spacing.xl },
    spacerSm: { height: spacing.sm },
    quickLinks: { marginTop: spacing.xl },
    quickLinksLabel: {
      color: colors.textMuted,
      fontWeight: "600" as const,
      marginBottom: spacing.sm,
    },
  });

const MaterialIcon = MaterialIconsBase as unknown as React.ComponentType<
  React.ComponentProps<typeof MaterialIconsBase>
>;
