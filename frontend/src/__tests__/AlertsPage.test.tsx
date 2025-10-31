import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AlertsPage from "../pages/alerts/AlertsPage";
import type { ApiClient } from "../services/api-client";
import type { AlertsFeedResponse } from "../types/api";
import { createApiClientMock, renderWithApi } from "./testUtils";

describe("AlertsPage", () => {
  it("renders recent alerts with the requested window", async () => {
    const now = new Date("2025-01-02T10:00:00.000Z");
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(now.getTime());

    try {
      const feed: AlertsFeedResponse = {
        generated_at: "2025-01-02T10:00:00.000Z",
        items: [
          {
            device_id: "GB-1001",
            lookup: "token-1001",
            site: "Cape Town",
            ts: "2025-01-02T09:30:00.000Z",
            fault_count: 2,
            faults: ["low_flow", "overheat"],
            active: true,
            active_faults: ["low_flow"],
            last_update: "2025-01-02T09:45:00.000Z",
          },
        ],
        stats: {
          total: 3,
          active: 1,
        },
      };

      const getMock = vi.fn<ApiClient["get"]>().mockResolvedValue(feed);
      const apiClient = createApiClientMock({ get: getMock });

      renderWithApi(<AlertsPage />, apiClient, "/app/alerts?hours=48");

      await screen.findByText("Total alerts");
      expect(getMock).toHaveBeenCalledTimes(1);
      expect(getMock.mock.calls[0][0]).toBe("/api/alerts/recent?hours=48");

      expect(screen.getByText("Last 48h")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("GB-1001")).toBeInTheDocument();
      expect(screen.getByText("Inspect device")).toBeInTheDocument();
    } finally {
      dateSpy.mockRestore();
    }
  });

  it("shows an error callout when the feed request fails", async () => {
    const getMock = vi.fn<ApiClient["get"]>().mockRejectedValue(new Error("boom"));
    const apiClient = createApiClientMock({ get: getMock });

    renderWithApi(<AlertsPage />, apiClient, "/app/alerts");

    await screen.findByText("Unable to load alerts");
  });
});
