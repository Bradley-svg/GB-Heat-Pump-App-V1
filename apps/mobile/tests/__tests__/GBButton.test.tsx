import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { GBButton } from "../../src/components/GBButton";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";

function renderButton(props: Partial<React.ComponentProps<typeof GBButton>>) {
  return render(
    <GBThemeProvider>
      <GBButton label="Submit" {...props} />
    </GBThemeProvider>
  );
}

describe("GBButton", () => {
  it("invokes onPress while enabled", () => {
    const onPress = jest.fn();
    const { getByRole } = renderButton({ onPress });

    fireEvent.press(getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows leading icon content", () => {
    const { getByText } = renderButton({
      leadingIcon: <Text accessibilityRole="text">icon</Text>,
    });

    expect(getByText("icon")).toBeTruthy();
  });

  it("disables interaction while loading", () => {
    const onPress = jest.fn();
    const { getByRole } = renderButton({ loading: true, onPress });

    const button = getByRole("button");
    expect(button.props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    });

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
