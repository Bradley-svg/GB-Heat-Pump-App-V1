import React from "react";
import { render } from "@testing-library/react-native";
import { GBStepper } from "../../src/components/GBStepper";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";

const steps = [
  { id: "1", label: "Install", state: "complete" as const },
  { id: "2", label: "Calibrate", state: "current" as const },
  { id: "3", label: "Verify", state: "error" as const }
];

test("GBStepper renders each step label", () => {
  const { getByText } = render(
    <GBThemeProvider>
      <GBStepper steps={steps} />
    </GBThemeProvider>
  );
  expect(getByText("Install")).toBeTruthy();
  expect(getByText("Calibrate")).toBeTruthy();
  expect(getByText("Verify")).toBeTruthy();
});
