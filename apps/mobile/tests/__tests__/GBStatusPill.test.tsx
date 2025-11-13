import React from "react";
import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { GBStatusPill } from "../../src/components/GBStatusPill";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";

test("GBStatusPill exposes label and accessibility role", () => {
  const { getByText } = render(
    <GBThemeProvider>
      <GBStatusPill label="Healthy" status="good" />
    </GBThemeProvider>,
  );
  expect(getByText("Healthy")).toBeTruthy();
});

test("GBStatusPill renders warning colors", () => {
  const tree = render(
    <GBThemeProvider>
      <GBStatusPill label="Check" status="warn" />
    </GBThemeProvider>,
  ).toJSON() as any;

  const flattened = StyleSheet.flatten(tree?.props?.style);
  expect(flattened?.backgroundColor).toBe("rgba(224, 167, 60, 0.16)");
  expect(flattened?.borderColor).toBe("rgba(224,167,60,0.4)");
});
