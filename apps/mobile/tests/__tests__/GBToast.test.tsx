import React from "react";
import { render } from "@testing-library/react-native";
import { GBToast } from "../../src/components/GBToast";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";

const renderWithTheme = (ui: React.ReactNode) => render(<GBThemeProvider>{ui}</GBThemeProvider>);

test("GBToast renders message when visible", () => {
  const { getByText } = renderWithTheme(
    <GBToast visible message="Saved" type="success" onDismiss={jest.fn()} />
  );
  expect(getByText("Saved")).toBeTruthy();
});
