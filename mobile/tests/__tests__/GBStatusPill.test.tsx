import React from "react";
import { render } from "@testing-library/react-native";
import { GBStatusPill } from "../../src/components/GBStatusPill";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";

test("GBStatusPill exposes label and accessibility role", () => {
  const { getByText } = render(
    <GBThemeProvider>
      <GBStatusPill label="Healthy" status="good" />
    </GBThemeProvider>
  );
  expect(getByText("Healthy")).toBeTruthy();
});
