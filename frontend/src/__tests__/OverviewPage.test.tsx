import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OverviewPage from "../pages/overview/OverviewPage";
import type { ApiClient } from "../services/api-client";
import type { FleetSummaryResponse } from "../types/api";
import { createApiClientMock, renderWithApi } from "./testUtils";

describe("OverviewPage", () => {
  it("renders fleet metrics when the summary request succeeds", async () => {
    const now = new Date("2025-01-02T10:00:00.000Z");
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(now.getTime());

    try {
      const summary: FleetSummaryResponse = {
        devices_total: 5,
        devices_online: 3,
        online_pct: 85,
        avg_cop_24h: 4.321,
        low_deltaT_count_24h: 2,
        max_heartbeat_age_sec: 1_800,
        window_start_ms: Date.parse("2025-01-02T08:00:00.000Z"),
        generated_at: "2025-01-02T10:00:00.000Z",
      };

      const getMock: ApiClient["get"] = vi.fn().mockResolvedValue(summary);
      const apiClient = createApiClientMock({ get: getMock });

      renderWithApi(<OverviewPage />, apiClient, "/app/overview");

      await screen.findByText("85%");
      expect(getMock).toHaveBeenCalledTimes(1);
      const [, options] = getMock.mock.calls[0];
      expect(options?.signal).toBeInstanceOf(AbortSignal);

      expect(screen.getByText("Avg COP (24h)")).toBeInTheDocument();
      expect(screen.getByText("4.32")).toBeInTheDocument();

      const onlineCard = screen.getByText("Online %").closest(".card");
      expect(onlineCard).toBeTruthy();
      expect(within(onlineCard as HTMLElement).getByText("3/5 online")).toBeInTheDocument();

      expect(screen.getByText("Window start 2h ago")).toBeInTheDocument();
      expect(screen.getByText("Oldest heartbeat 30m")).toBeInTheDocument();

      const devicesCard = screen.getByText("Devices").closest(".card");
      expect(devicesCard).toBeTruthy();
      expect(within(devicesCard as HTMLElement).getByText("3/5 online")).toBeInTheDocument();
    } finally {
      dateSpy.mockRestore();
    }
  });

  it("shows an error callout when the summary request fails", async () => {
    const getMock: ApiClient["get"] = vi.fn().mockRejectedValue(new Error("network"));
    const apiClient = createApiClientMock({ get: getMock });

    renderWithApi(<OverviewPage />, apiClient, "/app/overview");

    await screen.findByText("Failed to load fleet metrics");
    expect(getMock).toHaveBeenCalled();
  });
});
