import React from "react";
import { View, Text } from "react-native";
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
  testID
}) => {
  const { colors, spacing } = useTheme();
  const isHorizontal = orientation === "horizontal";

  return (
    <View
      testID={testID}
      accessibilityRole="list"
      style={{
        flexDirection: isHorizontal ? "row" : "column",
        alignItems: isHorizontal ? "center" : "flex-start"
      }}
    >
      {steps.map((step, index) => {
        const palette = stepPalette(step.state, colors);
        return (
          <View
            key={step.id}
            accessibilityRole="listitem"
            style={{
              flexDirection: isHorizontal ? "row" : "column",
              alignItems: "center",
              marginRight: isHorizontal && index < steps.length - 1 ? spacing.lg : 0,
              marginBottom: !isHorizontal && index < steps.length - 1 ? spacing.md : 0
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: palette.fill,
                justifyContent: "center",
                alignItems: "center"
              }}
            >
              <Text style={{ color: palette.text, fontWeight: "700" }}>{index + 1}</Text>
            </View>
            <Text
              style={{
                color: palette.label,
                marginTop: isHorizontal ? 0 : spacing.xs,
                marginLeft: isHorizontal ? spacing.xs : 0,
                fontSize: 14,
                fontWeight: step.state === "current" ? "700" : "500"
              }}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const stepPalette = (
  state: StepState,
  colors: ReturnType<typeof useTheme>["colors"]
): { fill: string; text: string; label: string } => {
  switch (state) {
    case "complete":
      return { fill: colors.primary, text: colors.onPrimary, label: colors.text };
    case "error":
      return { fill: colors.error, text: colors.onPrimary, label: colors.error };
    default:
      return { fill: colors.surfaceMuted, text: colors.text, label: colors.text };
  }
};
