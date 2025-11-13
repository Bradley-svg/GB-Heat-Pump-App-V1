import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GBCard } from "../components/GBCard";
import { GBListItem } from "../components/GBListItem";
import { GBStatusPill } from "../components/GBStatusPill";
import { GBStepper } from "../components/GBStepper";
import { useTheme } from "../theme/GBThemeProvider";

const tabs = ["Overview", "History"] as const;
type ThemeSpacing = ReturnType<typeof useTheme>["spacing"];
type ThemeColors = ReturnType<typeof useTheme>["colors"];

export const DeviceDetailScreen: React.FC = () => {
  const { spacing, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const themedStyles = useMemo(
    () => createStyles(spacing, colors),
    [colors, spacing],
  );

  return (
    <ScrollView contentContainerStyle={themedStyles.scrollContent}>
      <View style={themedStyles.tabRow}>
        {tabs.map((tab) => {
          const selected = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[
                themedStyles.tab,
                selected
                  ? themedStyles.tabSelected
                  : themedStyles.tabUnselected,
              ]}
            >
              <Text
                style={[
                  themedStyles.tabLabel,
                  selected ? themedStyles.tabLabelSelected : null,
                ]}
                maxFontSizeMultiplier={1.4}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <GBCard title="Device Health" tone="default">
        <GBStatusPill label="Normal" status="good" />
        <Text style={themedStyles.bodyCopy}>
          Last sync 5 minutes ago | Firmware 2.14.0
        </Text>
      </GBCard>

      <GBCard title="Commissioning Progress" tone="muted">
        <GBStepper
          steps={[
            { id: "1", label: "Install", state: "complete" },
            { id: "2", label: "Calibrate", state: "current" },
            { id: "3", label: "Verify", state: "error" },
          ]}
        />
      </GBCard>

      <View>
        <Text style={themedStyles.sectionLabel}>Faults</Text>
        <GBListItem
          title="Low Flow Rate"
          subtitle="Detected 10 minutes ago"
          rightAccessory="badge"
          badgeLabel="New"
        />
        <GBListItem title="Outdoor Sensor Drift" subtitle="In monitoring" />
      </View>
    </ScrollView>
  );
};

const createStyles = (spacing: ThemeSpacing, colors: ThemeColors) =>
  StyleSheet.create({
    scrollContent: { padding: spacing.lg },
    tabRow: { flexDirection: "row", marginBottom: spacing.lg },
    tab: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 999,
      marginRight: spacing.sm,
      borderWidth: 1,
    },
    tabSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabUnselected: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.surfaceMuted,
    },
    tabLabel: { fontWeight: "600" as const, color: colors.text },
    tabLabelSelected: { color: colors.onPrimary },
    bodyCopy: { color: colors.textMuted, marginTop: spacing.sm },
    sectionLabel: {
      color: colors.textMuted,
      fontWeight: "600" as const,
      marginBottom: spacing.sm,
    },
  });
