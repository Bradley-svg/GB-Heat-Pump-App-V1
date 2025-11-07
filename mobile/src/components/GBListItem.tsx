import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
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
  testID
}) => {
  const { colors, spacing } = useTheme();
  const isPressable = typeof onPress === "function";

  return (
    <Pressable
      testID={testID}
      accessibilityRole={isPressable ? "button" : "text"}
      onPress={onPress}
      android_ripple={
        isPressable ? { color: "rgba(57,181,74,0.1)", borderless: false } : undefined
      }
      style={({ pressed }) => [
        styles.row,
        { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
        pressed && Platform.OS === "ios"
          ? { backgroundColor: "rgba(57,181,74,0.08)" }
          : { backgroundColor: "transparent" }
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }} maxFontSizeMultiplier={1.4}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{ color: colors.textMuted, fontSize: 14, marginTop: spacing.xs }}
            maxFontSizeMultiplier={1.4}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAccessory === "badge" && badgeLabel ? (
        <View
          style={{
            backgroundColor: colors.surfaceMuted,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: 999
          }}
        >
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }} maxFontSizeMultiplier={1.4}>
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

const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center" } });
