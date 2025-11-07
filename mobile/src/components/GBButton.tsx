import React from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useTheme, elevation } from "../theme/GBThemeProvider";

type Variant = "primary" | "ghost" | "danger";

export interface GBButtonProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  leadingIcon?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}

export const GBButton: React.FC<GBButtonProps> = ({
  label,
  variant = "primary",
  loading = false,
  disabled = false,
  onPress,
  leadingIcon,
  testID,
  accessibilityLabel
}) => {
  const { colors, spacing, radii } = useTheme();
  const isDisabled = disabled || loading;

  const palette = getPalette(variant, colors);
  const rippleColor = palette.ripple;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: rippleColor, borderless: false }}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.md,
          backgroundColor: isDisabled ? palette.disabledBg : palette.bg,
          opacity: pressed && Platform.OS === "ios" ? 0.88 : 1
        },
        variant === "ghost"
          ? { borderWidth: 1, borderColor: colors.primary, backgroundColor: "transparent" }
          : null,
        variant !== "ghost" ? elevation(1) : null
      ]}
    >
      <View style={styles.content}>
        {leadingIcon ? <View style={styles.icon}>{leadingIcon}</View> : null}
        <Text
          style={{
            color: isDisabled ? palette.disabledText : palette.text,
            fontSize: 16,
            fontWeight: "600",
            letterSpacing: 0.2
          }}
          maxFontSizeMultiplier={1.4}
        >
          {label}
        </Text>
        {loading ? (
          <ActivityIndicator
            color={palette.loader}
            size="small"
            style={{ marginLeft: spacing.xs }}
          />
        ) : null}
      </View>
    </Pressable>
  );
};

const getPalette = (
  variant: Variant,
  colors: ReturnType<typeof useTheme>["colors"]
): {
  bg: string;
  text: string;
  loader: string;
  disabledBg: string;
  disabledText: string;
  ripple: string;
} => {
  switch (variant) {
    case "ghost":
      return {
        bg: "transparent",
        text: colors.primary,
        loader: colors.primary,
        disabledBg: "transparent",
        disabledText: colors.textMuted,
        ripple: "rgba(57,181,74,0.16)"
      };
    case "danger":
      return {
        bg: colors.error,
        text: colors.onPrimary,
        loader: colors.onPrimary,
        disabledBg: "rgba(194,59,59,0.4)",
        disabledText: "rgba(255,255,255,0.7)",
        ripple: "rgba(194,59,59,0.24)"
      };
    default:
      return {
        bg: colors.primary,
        text: colors.onPrimary,
        loader: colors.onPrimary,
        disabledBg: "rgba(57,181,74,0.5)",
        disabledText: "rgba(255,255,255,0.7)",
        ripple: "rgba(57,181,74,0.24)"
      };
  }
};

const styles = StyleSheet.create({
  base: { minHeight: 48, justifyContent: "center" },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  icon: { marginRight: 8 }
});
