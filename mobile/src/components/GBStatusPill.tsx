import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "../theme/GBThemeProvider";

type Status = "good" | "warn" | "bad" | "info";

export interface GBStatusPillProps {
  label: string;
  status: Status;
  testID?: string;
}

export const GBStatusPill: React.FC<GBStatusPillProps> = ({ label, status, testID }) => {
  const { colors, spacing, radii } = useTheme();
  const tone = getTone(status, colors);

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      style={{
        borderRadius: radii.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: tone.bg,
        borderWidth: 1,
        borderColor: tone.border
      }}
    >
      <Text
        style={{ color: tone.text, fontWeight: "600", fontSize: 13 }}
        maxFontSizeMultiplier={1.4}
      >
        {label}
      </Text>
    </View>
  );
};

const getTone = (
  status: Status,
  colors: ReturnType<typeof useTheme>["colors"]
): { bg: string; text: string; border: string } => {
  switch (status) {
    case "good":
      return { bg: "rgba(63, 186, 94, 0.16)", text: colors.success, border: "rgba(63,186,94,0.4)" };
    case "warn":
      return { bg: "rgba(224, 167, 60, 0.16)", text: colors.warning, border: "rgba(224,167,60,0.4)" };
    case "bad":
      return { bg: "rgba(194, 59, 59, 0.16)", text: colors.error, border: "rgba(194,59,59,0.4)" };
    default:
      return { bg: "rgba(31, 123, 181, 0.16)", text: colors.info, border: "rgba(31,123,181,0.4)" };
  }
};
