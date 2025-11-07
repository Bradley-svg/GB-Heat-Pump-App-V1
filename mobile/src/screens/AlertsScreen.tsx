import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useTheme } from "../theme/GBThemeProvider";
import { GBStatusPill } from "../components/GBStatusPill";
import { GBListItem } from "../components/GBListItem";
import { GBCard } from "../components/GBCard";
import { GBButton } from "../components/GBButton";

const severityOptions = ["All", "Critical", "Warning", "Info"] as const;

export const AlertsScreen: React.FC<{ onShowToast: (message: string, type: "success" | "warn" | "error") => void }> =
  ({ onShowToast }) => {
    const { spacing, colors } = useTheme();
    const [selectedSeverity, setSeverity] = useState<(typeof severityOptions)[number]>("All");
    const [activeAlert, setActiveAlert] = useState<string | null>(null);

    const alerts = useMemo(
      () => [
        { id: "a1", title: "Compressor Overheat", severity: "Critical", description: "Unit GB-301" },
        { id: "a2", title: "Filter Maintenance", severity: "Warning", description: "Unit GB-112" },
        { id: "a3", title: "Normal Reset", severity: "Info", description: "Unit GB-042" }
      ],
      []
    );

    const filtered = alerts.filter((alert) =>
      selectedSeverity === "All" ? true : alert.severity === selectedSeverity
    );

    const closeSheet = () => setActiveAlert(null);

    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <View style={{ flexDirection: "row", marginBottom: spacing.lg }}>
            {severityOptions.map((option) => {
              const selected = option === selectedSeverity;
              return (
                <Pressable
                  key={option}
                  onPress={() => setSeverity(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? "rgba(57,181,74,0.1)" : "transparent",
                    marginRight: spacing.sm
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.primary : colors.textMuted,
                      fontWeight: "600"
                    }}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {filtered.map((alert) => (
            <GBListItem
              key={alert.id}
              title={alert.title}
              subtitle={`${alert.severity} • ${alert.description}`}
              rightAccessory="chevron"
              onPress={() => setActiveAlert(alert.id)}
            />
          ))}
        </ScrollView>

        <Modal visible={Boolean(activeAlert)} animationType="slide" transparent>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.3)",
              justifyContent: "flex-end"
            }}
          >
            <View
              style={{
                backgroundColor: colors.surfaceElevated,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: spacing.lg
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>
                Alert detail
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>
                Immediate manual review recommended. Dismiss once resolved.
              </Text>
              <GBCard title="Status" tone="warning">
                <GBStatusPill label="Active Warning" status="warn" />
              </GBCard>
              <GBButton
                label="Dismiss"
                onPress={() => {
                  onShowToast("Alert resolved", "success");
                  closeSheet();
                }}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  };
