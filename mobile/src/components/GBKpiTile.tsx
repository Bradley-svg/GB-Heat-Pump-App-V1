import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme, elevation } from "../theme/GBThemeProvider";
import { formatDelta } from "../utils/accessibility";

export interface GBKpiTileProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  testID?: string;
}

export const GBKpiTile: React.FC<GBKpiTileProps> = ({ label, value, unit, delta, testID }) => {
  const { colors, spacing, radii, typeScale } = useTheme();
  const formattedDelta = typeof delta === "number" ? formatDelta(delta) : null;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${label} ${value} ${unit ?? ""} ${formattedDelta ?? ""}`}
      style={[
        styles.tile,
        elevation(1),
        {
          backgroundColor: colors.surfaceElevated,
          borderRadius: radii.lg,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg
        }
      ]}
    >
      <Text
        style={{ color: colors.textMuted, fontSize: typeScale.label.size, fontWeight: "500" }}
        maxFontSizeMultiplier={1.4}
      >
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text
          style={{
            color: colors.text,
            fontSize: typeScale.title.size,
            fontWeight: "700"
          }}
          maxFontSizeMultiplier={1.4}
        >
          {value}
        </Text>
        {unit ? (
          <Text
            style={{
              color: colors.textMuted,
              marginLeft: 4,
              fontSize: typeScale.body.size
            }}
            maxFontSizeMultiplier={1.4}
          >
            {unit}
          </Text>
        ) : null}
      </View>
      {formattedDelta ? (
        <Text
          style={{
            color: delta! >= 0 ? colors.success : colors.error,
            fontSize: typeScale.label.size,
            marginTop: spacing.xs
          }}
          maxFontSizeMultiplier={1.4}
        >
          {formattedDelta}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: { minWidth: 140, minHeight: 112, marginRight: 16 },
  valueRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 4 }
});
