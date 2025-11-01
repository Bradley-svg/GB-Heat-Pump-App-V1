import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OverviewPage from "../pages/overview/OverviewPage";
import type { ApiClient, RequestOptions } from "../services/api-client";
import type { FleetSummaryResponse } from "../types/api";
import { createApiClientMock, mockApiGet, renderWithApi } from "./testUtils";

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

      const getImplementation: ApiClient["get"] = <T,>() => Promise.resolve(summary as T);
      const getMock = vi.fn(getImplementation);
      const apiClient = createApiClientMock({ get: mockApiGet(getMock) });

      renderWithApi(<OverviewPage />, apiClient, "/app/overview");

      await screen.findByText("85%");
      expect(getMock).toHaveBeenCalledTimes(1);
      const [, options] = getMock.mock.calls[0] as [string, RequestOptions | undefined];
      expect(options?.signal).toBeInstanceOf(AbortSignal);

      expect(screen.getByText("Avg COP (24h)")).toBeInTheDocument();
      expect(screen.getByText("4.32")).toBeInTheDocument();

      const onlineInstances = screen.getAllByText("3/5 online");
      expect(onlineInstances).toHaveLength(2);

      expect(screen.getByText("Window start 2h ago")).toBeInTheDocument();
      expect(screen.getByText("Oldest heartbeat 30m")).toBeInTheDocument();

      expect(onlineInstances[1]).toBeInTheDocument();
    } finally {
      dateSpy.mockRestore();
    }
  });

  it("shows an error callout when the summary request fails", async () => {
    const getImplementation: ApiClient["get"] = <T,>() => Promise.reject<T>(new Error("network"));
    const getMock = vi.fn(getImplementation);
    const apiClient = createApiClientMock({ get: mockApiGet(getMock) });

    renderWithApi(<OverviewPage />, apiClient, "/app/overview");

    await screen.findByText("Failed to load fleet metrics");
    expect(getMock).toHaveBeenCalled();
  });
});

