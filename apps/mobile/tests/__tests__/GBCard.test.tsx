import React from "react";
import { StyleSheet, Text } from "react-native";
import { render } from "@testing-library/react-native";

import { GBCard } from "../../src/components/GBCard";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";

const renderCard = (props: Partial<React.ComponentProps<typeof GBCard>>) =>
  render(
    <GBThemeProvider>
      <GBCard title="Status" testID="card-under-test" {...props}>
        <Text accessibilityRole="text">Child content</Text>
      </GBCard>
    </GBThemeProvider>
  );

describe("GBCard", () => {
  it("renders title and children", () => {
    const { getByText } = renderCard({});

    expect(getByText("Status")).toBeTruthy();
    expect(getByText("Child content")).toBeTruthy();
  });

  it("applies warning tone palette", () => {
    const { getByTestId } = renderCard({ tone: "warning" });

    const summary = getByTestId("card-under-test");
    const flattened = StyleSheet.flatten(summary.props.style);

    expect(flattened?.backgroundColor).toBe("rgba(204,138,0,0.12)");
    expect(flattened?.borderColor).toBe("rgba(204,138,0,0.32)");
  });
});
