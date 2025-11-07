import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTheme } from "../theme/GBThemeProvider";
import { GBCard } from "../components/GBCard";
import { GBStatusPill } from "../components/GBStatusPill";
import { GBStepper } from "../components/GBStepper";
import { GBListItem } from "../components/GBListItem";

const tabs = ["Overview", "History"] as const;

export const DeviceDetailScreen: React.FC = () => {
  const { spacing, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <View style={{ flexDirection: "row", marginBottom: spacing.lg }}>
        {tabs.map((tab) => {
          const selected = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: 999,
                backgroundColor: selected ? colors.primary : colors.surfaceMuted,
                marginRight: spacing.sm
              }}
            >
              <Text
                style={{ color: selected ? colors.onPrimary : colors.text, fontWeight: "600" }}
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
        <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>
          Last sync 5 minutes ago • Firmware 2.14.0
        </Text>
      </GBCard>

      <GBCard title="Commissioning Progress" tone="muted">
        <GBStepper
          steps={[
            { id: "1", label: "Install", state: "complete" },
            { id: "2", label: "Calibrate", state: "current" },
            { id: "3", label: "Verify", state: "error" }
          ]}
        />
      </GBCard>

      <View>
        <Text style={{ color: colors.textMuted, fontWeight: "600", marginBottom: spacing.sm }}>
          Faults
        </Text>
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
