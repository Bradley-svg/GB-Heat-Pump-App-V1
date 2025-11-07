import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { GBCard } from "../../src/components/GBCard";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";

const renderWithTheme = (ui: React.ReactNode) => render(<GBThemeProvider>{ui}</GBThemeProvider>);

test("GBCard renders title and content", () => {
  const { getByText } = renderWithTheme(
    <GBCard title="Status" tone="warning">
      <Text>Details</Text>
    </GBCard>
  );
  expect(getByText("Status")).toBeTruthy();
  expect(getByText("Details")).toBeTruthy();
});
