import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { AlertsScreen } from "../../src/screens/AlertsScreen";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";
import { useAlertsFeed } from "../../src/hooks/useAlertsFeed";
import type { AlertsFeedResult } from "../../src/hooks/useAlertsFeed";

jest.mock("../../src/hooks/useAlertsFeed");

const renderWithTheme = (ui: React.ReactNode) =>
  render(<GBThemeProvider>{ui}</GBThemeProvider>);

const mockUseAlertsFeed =
  useAlertsFeed as jest.MockedFunction<typeof useAlertsFeed>;

const alertsResponse: NonNullable<AlertsFeedResult["data"]> = {
  generated_at: "2024-11-07T12:00:00Z",
  items: [
    {
      alert_id: "a-1",
      device_id: "hp-001",
      site: "Plant A",
      alert_type: "PRESSURE",
      severity: "Critical",
      status: "open",
      summary: "High pressure warning",
      description: "Pressure exceeded safe range",
      created_at: "2024-11-07T11:50:00Z",
      updated_at: "2024-11-07T11:55:00Z",
      lookup: {},
    },
    {
      alert_id: "a-2",
      device_id: "hp-002",
      site: "Plant B",
      alert_type: "FLOW",
      severity: "Warning",
      status: "open",
      summary: "Low flow detected",
      description: "Flow rate dropped below threshold",
      created_at: "2024-11-07T11:40:00Z",
      updated_at: "2024-11-07T11:41:00Z",
      lookup: {},
    },
  ],
};

describe("AlertsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAlertsFeed.mockReturnValue({
      data: alertsResponse,
      status: "success",
      error: null,
      refresh: jest.fn(),
    });
  });

  it("filters alerts by severity and opens the detail sheet", () => {
    const onShowToast = jest.fn();
    const { getByText, queryByText, getByTestId } = renderWithTheme(
      <AlertsScreen onShowToast={onShowToast} />,
    );

    expect(getByText("High pressure warning")).toBeTruthy();
    fireEvent.press(getByTestId("severity-warning"));
    expect(queryByText("High pressure warning")).toBeNull();
    expect(getByText("Low flow detected")).toBeTruthy();

    fireEvent.press(getByText("Low flow detected"));
    const placeholderButton = getByText("Acknowledgement coming soon");
    expect(placeholderButton).toBeTruthy();
    expect(
      getByText(/Use the web console to acknowledge alerts/i),
    ).toBeTruthy();
    expect(onShowToast).not.toHaveBeenCalled();
  });
});
