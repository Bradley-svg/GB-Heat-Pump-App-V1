import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { GBButton } from "../../src/components/GBButton";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";

const renderWithTheme = (ui: React.ReactNode) =>
  render(<GBThemeProvider>{ui}</GBThemeProvider>);

test("GBButton triggers onPress when enabled", () => {
  const onPress = jest.fn();
  const { getByRole } = renderWithTheme(
    <GBButton label="Tap me" onPress={onPress} />,
  );
  fireEvent.press(getByRole("button"));
  expect(onPress).toHaveBeenCalled();
});

test("GBButton disables interaction when disabled", () => {
  const onPress = jest.fn();
  const { getByRole } = renderWithTheme(
    <GBButton label="Disabled" disabled onPress={onPress} />,
  );
  fireEvent.press(getByRole("button"));
  expect(onPress).not.toHaveBeenCalled();
});
