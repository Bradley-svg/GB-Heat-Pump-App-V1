import React from "react";
import { act, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

import { GBToast } from "../../src/components/GBToast";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";

const renderToast = (props: Partial<React.ComponentProps<typeof GBToast>>) =>
  render(
    <GBThemeProvider>
      <GBToast visible message="Saved" {...props} />
    </GBThemeProvider>
  );

describe("GBToast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("auto dismisses after the configured duration", () => {
    const onDismiss = jest.fn();
    const { getByText, rerender } = renderToast({ visible: true, onDismiss, durationMs: 200 });

    expect(getByText("Saved")).toBeTruthy();

    act(() => {
      jest.runAllTimers();
    });
    expect(onDismiss).toHaveBeenCalled();

    rerender(
      <GBThemeProvider>
        <GBToast visible={false} message="Saved" onDismiss={onDismiss} />
      </GBThemeProvider>
    );
    expect(() => getByText("Saved")).toThrow();
  });

it("uses error haptics when type is error", () => {
  const hapticsSpy = jest.spyOn(Haptics, "notificationAsync");
  renderToast({ visible: true, type: "error", message: "Oops" });

  expect(hapticsSpy).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
});

it("renders warn palette colors", () => {
  const tree = renderToast({ visible: true, type: "warn", message: "Heads up" }).toJSON() as any;
  const flattened = StyleSheet.flatten(tree?.props?.style);
  expect(flattened?.backgroundColor).toBe("rgba(224,167,60,0.95)");
});
});
