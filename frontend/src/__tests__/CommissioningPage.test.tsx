import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CommissioningPage from "../pages/commissioning/CommissioningPage";
import type { ApiClient } from "../services/api-client";
import type { CommissioningResponse } from "../types/api";
import { createApiClientMock, renderWithApi } from "./testUtils";

describe("CommissioningPage", () => {
  it("renders commissioning summary and device progress", async () => {
    const now = new Date("2025-01-02T10:00:00.000Z");
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(now.getTime());

    try {
      const response: CommissioningResponse = {
        generated_at: "2025-01-02T10:00:00.000Z",
        summary: {
          total: 2,
          ready: 1,
        },
        devices: [
          {
            device_id: "GB-1001",
            lookup: "token-1001",
            site: "Cape Town",
            online: true,
            last_seen_at: "2025-01-02T09:59:00.000Z",
            supplyC: 45.2,
            returnC: 39.9,
            deltaT: 5.3,
            flowLps: 0.32,
            cop: 3.2,
            thermalKW: 4.5,
            mode: "heating",
            defrost: 0,
            powerKW: 1.4,
            updated_at: "2025-01-02T09:59:00.000Z",
          },
          {
            device_id: "GB-1002",
            lookup: "token-1002",
            site: "Johannesburg",
            online: true,
            last_seen_at: "2025-01-02T09:20:00.000Z",
            supplyC: 42.0,
            returnC: 39.5,
            deltaT: 2.5,
            flowLps: null,
            cop: 2.8,
            thermalKW: 3.1,
            mode: null,
            defrost: 0,
            powerKW: 1.3,
            updated_at: "2025-01-02T09:20:00.000Z",
          },
        ],
      };

      const getMock = vi.fn<ApiClient["get"]>().mockResolvedValue(response);
      const apiClient = createApiClientMock({ get: getMock });

      renderWithApi(<CommissioningPage />, apiClient, "/app/commissioning");

      await screen.findByText("Readiness overview");
      expect(getMock).toHaveBeenCalledWith("/api/commissioning/checklist", expect.objectContaining({ signal: expect.any(AbortSignal) }));

      expect(screen.getByText("1 ready of 2")).toBeInTheDocument();
      expect(screen.getByText("50% checklist complete across fleet")).toBeInTheDocument();
      expect(screen.getByText("GB-1001")).toBeInTheDocument();
      expect(screen.getByText("GB-1002")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("40%")).toBeInTheDocument();
      expect(screen.getAllByText("Open device")).toHaveLength(2);
    } finally {
      dateSpy.mockRestore();
    }
  });

  it("shows an error callout when the commissioning request fails", async () => {
    const getMock = vi.fn<ApiClient["get"]>().mockRejectedValue(new Error("fail"));
    const apiClient = createApiClientMock({ get: getMock });

    renderWithApi(<CommissioningPage />, apiClient, "/app/commissioning");

    await screen.findByText("Unable to load commissioning status");
  });
});
