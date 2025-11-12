import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme/GBThemeProvider";

type RightAccessory = "chevron" | "badge" | undefined;

export interface GBListItemProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightAccessory?: RightAccessory;
  badgeLabel?: string;
  testID?: string;
}

export const GBListItem: React.FC<GBListItemProps> = ({
  title,
  subtitle,
  onPress,
  rightAccessory = "chevron",
  badgeLabel,
  testID,
}) => {
  const { colors, spacing } = useTheme();
  const isPressable = typeof onPress === "function";
  const containerPadding = useMemo(
    () => ({
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    }),
    [spacing.lg, spacing.md],
  );
  const titleStyle = useMemo(
    () => ({
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    }),
    [colors.text],
  );
  const subtitleStyle = useMemo(
    () => ({
      color: colors.textMuted,
      fontSize: 14,
      marginTop: spacing.xs,
    }),
    [colors.textMuted, spacing.xs],
  );
  const badgeContainer = useMemo(
    () => ({
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 999,
    }),
    [colors.surfaceMuted, spacing.sm, spacing.xs],
  );
  const badgeText = useMemo(
    () => ({
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    }),
    [colors.text],
  );

  return (
    <Pressable
      testID={testID}
      accessibilityRole={isPressable ? "button" : "text"}
      onPress={onPress}
      android_ripple={
        isPressable
          ? { color: "rgba(57,181,74,0.1)", borderless: false }
          : undefined
      }
      style={({ pressed }) => [
        styles.row,
        containerPadding,
        pressed && Platform.OS === "ios" ? styles.iosPressed : null,
      ]}
    >
      <View style={styles.flex}>
        <Text style={titleStyle} maxFontSizeMultiplier={1.4}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={subtitleStyle} maxFontSizeMultiplier={1.4}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAccessory === "badge" && badgeLabel ? (
        <View style={badgeContainer}>
          <Text style={badgeText} maxFontSizeMultiplier={1.4}>
            {badgeLabel}
          </Text>
        </View>
      ) : null}
      {rightAccessory === "chevron" ? (
        <MaterialIcons
          name={Platform.OS === "ios" ? "chevron-right" : "arrow-forward-ios"}
          size={20}
          color={colors.textMuted}
          accessibilityElementsHidden
        />
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  iosPressed: { backgroundColor: "rgba(57,181,74,0.08)" },
});
