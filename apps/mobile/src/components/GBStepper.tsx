import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme/GBThemeProvider";

export type StepState = "current" | "complete" | "error";

export interface StepItem {
  id: string;
  label: string;
  state: StepState;
}

export interface GBStepperProps {
  steps: StepItem[];
  orientation?: "horizontal" | "vertical";
  testID?: string;
}

export const GBStepper: React.FC<GBStepperProps> = ({
  steps,
  orientation = "horizontal",
  testID,
}) => {
  const { colors, spacing } = useTheme();
  const isHorizontal = orientation === "horizontal";
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: isHorizontal ? "row" : "column",
          alignItems: isHorizontal ? "center" : "flex-start",
        },
        stepWrapper: {
          flexDirection: isHorizontal ? "row" : "column",
          alignItems: "center",
        },
        gapHorizontal: { marginRight: spacing.lg },
        gapVertical: { marginBottom: spacing.md },
        badge: {
          width: 32,
          height: 32,
          borderRadius: 16,
          justifyContent: "center",
          alignItems: "center",
        },
        label: {
          marginTop: isHorizontal ? 0 : spacing.xs,
          marginLeft: isHorizontal ? spacing.xs : 0,
          fontSize: 14,
        },
      }),
    [isHorizontal, spacing.lg, spacing.md, spacing.xs],
  );
  const paletteStyles = useMemo<
    Record<
      StepState,
      {
        circle: { backgroundColor: string };
        number: { color: string; fontWeight: "500" | "600" | "700" };
        label: { color: string; fontWeight: "500" | "600" | "700" };
      }
    >
  >(
    () => ({
      complete: {
        circle: { backgroundColor: colors.primary },
        number: { color: colors.onPrimary, fontWeight: "700" as const },
        label: { color: colors.text, fontWeight: "500" as const },
      },
      error: {
        circle: { backgroundColor: colors.error },
        number: { color: colors.onPrimary, fontWeight: "700" as const },
        label: { color: colors.error, fontWeight: "600" as const },
      },
      current: {
        circle: { backgroundColor: colors.surfaceMuted },
        number: { color: colors.text, fontWeight: "700" as const },
        label: { color: colors.text, fontWeight: "700" as const },
      },
    }),
    [
      colors.error,
      colors.onPrimary,
      colors.primary,
      colors.surfaceMuted,
      colors.text,
    ],
  );

  return (
    <View
      testID={testID}
      accessibilityRole="list"
      style={dynamicStyles.container}
    >
      {steps.map((step, index) => {
        const palette = paletteStyles[step.state];
        return (
          <View
            key={step.id}
            style={[
              dynamicStyles.stepWrapper,
              index < steps.length - 1
                ? isHorizontal
                  ? dynamicStyles.gapHorizontal
                  : dynamicStyles.gapVertical
                : null,
            ]}
          >
            <View style={[dynamicStyles.badge, palette.circle]}>
              <Text style={palette.number}>{index + 1}</Text>
            </View>
            <Text style={[dynamicStyles.label, palette.label]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};
