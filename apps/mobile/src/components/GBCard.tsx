import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

import { useTheme, elevation } from "../theme/GBThemeProvider";

type Tone = "default" | "muted" | "warning" | "error";

export interface GBCardProps {
  title: string;
  children: React.ReactNode;
  tone?: Tone;
  testID?: string;
}

export const GBCard: React.FC<GBCardProps> = ({
  title,
  children,
  tone = "default",
  testID,
}) => {
  const { colors, spacing, radii } = useTheme();
  const palette = tonePalette(tone, colors);
  const containerStyle = useMemo(
    () => ({
      backgroundColor: palette.background,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderColor: palette.border,
    }),
    [palette.background, palette.border, radii.lg, spacing.lg],
  );
  const titleStyle = useMemo(
    () => ({
      color: palette.title,
      fontSize: 18,
      fontWeight: "600" as const,
      marginBottom: spacing.sm,
    }),
    [palette.title, spacing.sm],
  );

  return (
    <View
      testID={testID}
      accessibilityRole="summary"
      style={[
        styles.container,
        elevation(palette.elevation),
        containerStyle,
        styles.containerBorder,
      ]}
    >
      <Text style={titleStyle} maxFontSizeMultiplier={1.4}>
        {title}
      </Text>
      <View>{children}</View>
    </View>
  );
};

const tonePalette = (
  tone: Tone,
  colors: ReturnType<typeof useTheme>["colors"],
): { background: string; title: string; border: string; elevation: 1 | 2 } => {
  switch (tone) {
    case "muted":
      return {
        background: colors.surfaceMuted,
        title: colors.text,
        border: colors.border,
        elevation: 1,
      };
    case "warning":
      return {
        background: "rgba(204,138,0,0.12)",
        title: colors.warning,
        border: "rgba(204,138,0,0.32)",
        elevation: 1,
      };
    case "error":
      return {
        background: "rgba(194,59,59,0.12)",
        title: colors.error,
        border: "rgba(194,59,59,0.32)",
        elevation: 1,
      };
    default:
      return {
        background: colors.surfaceElevated,
        title: colors.text,
        border: colors.border,
        elevation: 1,
      };
  }
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  containerBorder: { borderWidth: 1 },
});
