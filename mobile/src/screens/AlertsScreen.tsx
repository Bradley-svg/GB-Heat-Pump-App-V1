import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GBButton } from "../components/GBButton";
import { GBCard } from "../components/GBCard";
import { GBListItem } from "../components/GBListItem";
import { GBStatusPill } from "../components/GBStatusPill";
import { useAlertsFeed, type AlertRecord } from "../hooks/useAlertsFeed";
import { useTheme } from "../theme/GBThemeProvider";

const severityOptions = ["All", "Critical", "Warning", "Info"] as const;

const severityMap: Record<string, "good" | "warn" | "bad" | "info"> = {
  critical: "bad",
  warning: "warn",
  info: "info",
};

interface AlertsScreenProps {
  onShowToast: (message: string, type: "success" | "warn" | "error") => void;
}

type ThemeSpacing = ReturnType<typeof useTheme>["spacing"];
type ThemeColors = ReturnType<typeof useTheme>["colors"];

export const AlertsScreen: React.FC<AlertsScreenProps> = ({ onShowToast }) => {
  const { spacing, colors } = useTheme();
  const [selectedSeverity, setSeverity] =
    useState<(typeof severityOptions)[number]>("All");
  const [activeAlert, setActiveAlert] = useState<AlertRecord | null>(null);
  const { data, status, error, refresh } = useAlertsFeed({
    limit: 50,
    status: "open",
  });
  const themedStyles = useMemo(
    () => createStyles(spacing, colors),
    [colors, spacing],
  );

  const filteredAlerts = useMemo(() => {
    const items = data?.items ?? [];
    if (selectedSeverity === "All") return items;
    return items.filter(
      (alert) =>
        alert.severity?.toLowerCase() === selectedSeverity.toLowerCase(),
    );
  }, [data, selectedSeverity]);

  const refreshing = status === "loading" && Boolean(data);

  return (
    <View style={themedStyles.screen}>
      <ScrollView
        contentContainerStyle={themedStyles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            colors={[colors.primary]}
            onRefresh={refresh}
          />
        }
      >
        <View style={themedStyles.filterRow}>
          {severityOptions.map((option) => {
            const selected = option === selectedSeverity;
            return (
              <Pressable
                key={option}
                onPress={() => setSeverity(option)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  themedStyles.chip,
                  selected
                    ? themedStyles.chipSelected
                    : themedStyles.chipUnselected,
                ]}
              >
                <Text
                  style={[
                    themedStyles.chipLabel,
                    selected ? themedStyles.chipLabelSelected : null,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {status === "error" ? (
          <GBCard title="Unable to load alerts" tone="error">
            <Text style={themedStyles.errorText}>
              {error?.message ?? "An unexpected error occurred."}
            </Text>
            <View style={themedStyles.spacerSm} />
            <GBButton label="Retry" onPress={refresh} />
          </GBCard>
        ) : null}

        {status === "loading" && !data ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          filteredAlerts.map((alert) => (
            <GBListItem
              key={alert.alert_id}
              title={alert.summary ?? alert.alert_type ?? "Alert"}
              subtitle={`${alert.site ?? "Unknown site"} | ${new Date(
                alert.created_at,
              ).toLocaleString()}`}
              rightAccessory="badge"
              badgeLabel={alert.severity ?? "info"}
              onPress={() => setActiveAlert(alert)}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={Boolean(activeAlert)} animationType="slide" transparent>
        <View style={themedStyles.modalBackdrop}>
          <View style={themedStyles.modalSheet}>
            {activeAlert ? (
              <>
                <Text style={themedStyles.modalTitle}>
                  {activeAlert.summary ?? "Alert detail"}
                </Text>
                <Text style={themedStyles.modalSubtitle}>
                  {activeAlert.description ?? "No additional context provided."}
                </Text>
                <View style={themedStyles.modalSection}>
                  <GBStatusPill
                    label={activeAlert.severity ?? "Info"}
                    status={
                      severityMap[
                        activeAlert.severity?.toLowerCase() ?? "info"
                      ] ?? "info"
                    }
                  />
                </View>
                <GBCard title="Device" tone="muted">
                  <Text style={themedStyles.cardText}>
                    {activeAlert.device_id} |{" "}
                    {activeAlert.site ?? "Unknown site"}
                  </Text>
                </GBCard>
                <GBButton
                  label="Mark as Acknowledged"
                  onPress={() => {
                    onShowToast("Acknowledged (mock)", "success");
                    setActiveAlert(null);
                  }}
                />
                <View style={themedStyles.spacerSm} />
                <GBButton
                  label="Close"
                  variant="ghost"
                  onPress={() => setActiveAlert(null)}
                />
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (spacing: ThemeSpacing, colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    scrollContent: { padding: spacing.lg },
    filterRow: {
      flexDirection: "row",
      marginBottom: spacing.lg,
      flexWrap: "wrap",
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 999,
      borderWidth: 1,
      marginRight: spacing.sm,
      marginBottom: spacing.xs,
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: "rgba(57,181,74,0.1)",
    },
    chipUnselected: {
      borderColor: colors.border,
      backgroundColor: "transparent",
    },
    chipLabel: { color: colors.textMuted, fontWeight: "600" },
    chipLabelSelected: { color: colors.primary },
    errorText: { color: colors.textMuted },
    spacerSm: { height: spacing.sm },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.25)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.surfaceElevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: spacing.lg,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    modalSubtitle: {
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    modalSection: { marginTop: spacing.md },
    cardText: { color: colors.text },
  });
