import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Linking } from "react-native";

import { DashboardScreen } from "../../src/screens/DashboardScreen";
import { GBThemeProvider } from "../../src/theme/GBThemeProvider";
import type { FleetSummaryResult } from "../../src/hooks/useFleetSummary";
import { useFleetSummary } from "../../src/hooks/useFleetSummary";
import { useHaptics } from "../../src/hooks/useHaptics";

jest.mock("../../src/hooks/useFleetSummary");
jest.mock("../../src/hooks/useHaptics");

const renderWithTheme = (ui: React.ReactNode) =>
  render(<GBThemeProvider>{ui}</GBThemeProvider>);

const mockUseFleetSummary =
  useFleetSummary as jest.MockedFunction<typeof useFleetSummary>;
const mockUseHaptics = useHaptics as jest.MockedFunction<typeof useHaptics>;

const fleetData: NonNullable<FleetSummaryResult["data"]> = {
  generated_at: "2024-11-07T12:00:00Z",
  kpis: {
    devices_total: 10,
    devices_online: 8,
    offline_count: 2,
    online_pct: 80,
    avg_cop: 3.2,
    low_deltaT_count: 1,
    open_alerts: 5,
    max_heartbeat_age_sec: 120,
  },
  trend: [
    { label: "12:00", cop: 3.1, thermalKW: 12.3, deltaT: 6.2 },
    { label: "13:00", cop: 3.3, thermalKW: 14.1, deltaT: 6.4 },
  ],
  top_devices: [
    {
      device_id: "hp-001",
      site: "HQ",
      online: true,
      last_seen_at: "2024-11-07T11:59:00Z",
      updated_at: "2024-11-07T11:59:30Z",
      cop: 3.4,
      deltaT: 6.5,
      thermalKW: 11.7,
      alert_count: 0,
      lookup: {},
    },
  ],
};

describe("DashboardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    mockUseFleetSummary.mockReturnValue({
      data: fleetData,
      status: "success",
      error: null,
      refresh: jest.fn(),
    });
    mockUseHaptics.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders live KPI data and triggers CTA toasts", () => {
    const onShowToast = jest.fn();
    const { getByText } = renderWithTheme(
      <DashboardScreen onShowToast={onShowToast} />,
    );

    expect(getByText("Fleet 80% Online")).toBeTruthy();
    expect(getByText("Energy Today")).toBeTruthy();
    fireEvent.press(getByText("Start Commissioning"));
    expect(onShowToast).toHaveBeenCalledWith(
      "Commissioning workflow created",
      "success",
    );
    fireEvent.press(getByText("View Alerts"));
    expect(onShowToast).toHaveBeenCalledWith("Opening alerts...", "warn");
  });

  it("shows fallback values when fleet data is unavailable", () => {
    mockUseFleetSummary.mockReturnValue({
      data: null,
      status: "success",
      error: null,
      refresh: jest.fn(),
    });
    const { getAllByText } = renderWithTheme(
      <DashboardScreen onShowToast={jest.fn()} />,
    );

    expect(getAllByText("--").length).toBeGreaterThan(0);
  });
});
