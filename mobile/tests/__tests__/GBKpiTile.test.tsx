import React from "react";
import { render } from "@testing-library/react-native";
import { GBKpiTile } from "../../src/components/GBKpiTile";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";

test("GBKpiTile renders value, unit, and delta", () => {
  const { getByText } = render(
    <GBThemeProvider>
      <GBKpiTile label="COP" value="4.2" unit="" delta={0.6} />
    </GBThemeProvider>
  );
  expect(getByText("4.2")).toBeTruthy();
  expect(getByText("+0.6")).toBeTruthy();
});
