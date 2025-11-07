import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { GBListItem } from "../../src/components/GBListItem";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";

const renderWithTheme = (ui: React.ReactNode) => render(<GBThemeProvider>{ui}</GBThemeProvider>);

test("GBListItem fires onPress handler", () => {
  const onPress = jest.fn();
  const { getByText } = renderWithTheme(
    <GBListItem title="Device 01" subtitle="Cape Town" onPress={onPress} />
  );
  fireEvent.press(getByText("Device 01"));
  expect(onPress).toHaveBeenCalled();
});

test("GBListItem renders badge accessory", () => {
  const { getByText } = renderWithTheme(
    <GBListItem title="High Priority" rightAccessory="badge" badgeLabel="3" />
  );
  expect(getByText("3")).toBeTruthy();
});
