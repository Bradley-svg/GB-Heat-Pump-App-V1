import React, { useMemo } from "react";
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

export const GBKpiTile: React.FC<GBKpiTileProps> = ({
  label,
  value,
  unit,
  delta,
  testID,
}) => {
  const { colors, spacing, radii, typeScale } = useTheme();
  const formattedDelta = typeof delta === "number" ? formatDelta(delta) : null;
  const tileStyle = useMemo(
    () => ({
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    }),
    [colors.surfaceElevated, radii.lg, spacing.lg, spacing.md],
  );
  const labelStyle = useMemo(
    () => ({
      color: colors.textMuted,
      fontSize: typeScale.label.size,
      fontWeight: "500" as const,
    }),
    [colors.textMuted, typeScale.label.size],
  );
  const valueStyle = useMemo(
    () => ({
      color: colors.text,
      fontSize: typeScale.title.size,
      fontWeight: "700" as const,
    }),
    [colors.text, typeScale.title.size],
  );
  const unitStyle = useMemo(
    () => ({
      color: colors.textMuted,
      marginLeft: spacing.xxs,
      fontSize: typeScale.body.size,
    }),
    [colors.textMuted, spacing.xxs, typeScale.body.size],
  );
  const deltaStyle = useMemo(
    () => ({
      color: (delta ?? 0) >= 0 ? colors.success : colors.error,
      fontSize: typeScale.label.size,
      marginTop: spacing.xs,
    }),
    [colors.error, colors.success, delta, spacing.xs, typeScale.label.size],
  );

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${label} ${value} ${unit ?? ""} ${formattedDelta ?? ""}`}
      style={[styles.tile, elevation(1), tileStyle]}
    >
      <Text style={labelStyle} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text style={valueStyle} maxFontSizeMultiplier={1.4}>
          {value}
        </Text>
        {unit ? (
          <Text style={unitStyle} maxFontSizeMultiplier={1.4}>
            {unit}
          </Text>
        ) : null}
      </View>
      {formattedDelta ? (
        <Text style={deltaStyle} maxFontSizeMultiplier={1.4}>
          {formattedDelta}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: { minWidth: 140, minHeight: 112, marginRight: 16 },
  valueRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 4 },
});
