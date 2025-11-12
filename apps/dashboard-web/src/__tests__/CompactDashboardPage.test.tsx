import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import CompactDashboardPage from "../pages/compact/CompactDashboardPage";
import type { ApiClient } from "../services/api-client";
import type { ClientCompactResponse, DeviceListResponse } from "../types/api";
import { createApiClientMock, mockApiGet, renderWithApi } from "./testUtils";

describe("CompactDashboardPage", () => {
  it("renders compact dashboard data and trend controls", async () => {
    const now = new Date("2025-01-02T10:00:00.000Z");
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(now.getTime());

    try {
      const summary: ClientCompactResponse = {
        generated_at: "2025-01-02T10:00:00.000Z",
        scope: "tenant",
        window_start_ms: Date.parse("2025-01-02T08:30:00.000Z"),
        kpis: {
          devices_total: 12,
          devices_online: 10,
          offline_count: 2,
          online_pct: 83,
          avg_cop: 3.412,
          low_deltaT_count: 4,
          open_alerts: 2,
          max_heartbeat_age_sec: 900,
        },
        alerts: [
          {
            device_id: "GB-1001",
            lookup: "token-1001",
            site: "Cape Town",
            ts: "2025-01-02T09:55:00.000Z",
            faults: ["low_flow", "overheat"],
            fault_count: 2,
            updated_at: "2025-01-02T09:58:00.000Z",
            active: true,
          },
        ],
        top_devices: [],
        trend: [
          { label: "08:30", cop: 3.1, thermalKW: 4.5, deltaT: 5.2 },
          { label: "08:35", cop: 3.4, thermalKW: 4.7, deltaT: 5.6 },
        ],
      };

      const devices: DeviceListResponse = {
        items: [
          {
            device_id: "GB-1001",
            lookup: "token-1001",
            profile_id: "profile-west",
            online: true,
            last_seen_at: "2025-01-02T09:59:00.000Z",
            site: "Cape Town",
            firmware: "1.0.3",
            map_version: "gb-map-v1",
          },
          {
            device_id: "GB-1002",
            lookup: "token-1002",
            profile_id: "profile-west",
            online: false,
            last_seen_at: "2025-01-02T09:40:00.000Z",
            site: "Johannesburg",
            firmware: "1.1.0",
            map_version: "gb-map-v1",
          },
        ],
        next: null,
      };

      const getImplementation: ApiClient["get"] = <T,>(path: string) => {
        if (path === "/api/client/compact") {
          return Promise.resolve(summary as T);
        }
        if (path.startsWith("/api/devices?mine=1&limit=12")) {
          return Promise.resolve(devices as T);
        }
        return Promise.reject(new Error(`Unexpected GET ${path}`));
      };
      const getMock = vi.fn(getImplementation);
      const apiClient = createApiClientMock({ get: mockApiGet(getMock) });
      const user = userEvent.setup();

      renderWithApi(<CompactDashboardPage />, apiClient, "/app/compact");

      await screen.findByText("Online rate");
      expect(getMock).toHaveBeenCalledTimes(2);

      expect(screen.getByText("83%")).toBeInTheDocument();
      expect(screen.getByText("Open alerts")).toBeInTheDocument();
      expect(screen.getByText("Fleet average COP")).toBeInTheDocument();
      expect(screen.getByText("Recent alerts")).toBeInTheDocument();
      expect(screen.getByText("Device roster")).toBeInTheDocument();

      expect(screen.getAllByText("Cape Town")).not.toHaveLength(0);
      const rosterTable = screen.getByRole("table");
      expect(within(rosterTable).getByText("Cape Town")).toBeInTheDocument();
      expect(within(rosterTable).getByText("Johannesburg")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Thermal kW" }));
      expect(screen.getByText("Thermal output (kW)")).toBeInTheDocument();
    } finally {
      dateSpy.mockRestore();
    }
  });

  it("shows an error callout when the summary request fails", async () => {
    const getImplementation: ApiClient["get"] = <T,>(path: string) => {
      if (path === "/api/client/compact") {
        return Promise.reject<T>(new Error("failure"));
      }
      if (path.startsWith("/api/devices?mine=1&limit=12")) {
        return Promise.resolve({ items: [], next: null } as T);
      }
      return Promise.reject<T>(new Error(`Unexpected GET ${path}`));
    };
    const getMock = vi.fn(getImplementation);
    const apiClient = createApiClientMock({ get: mockApiGet(getMock) });

    renderWithApi(<CompactDashboardPage />, apiClient, "/app/compact");

    await screen.findByText("Unable to load dashboard data");
    const firstCall = getMock.mock.calls[0]?.[0];
    expect(firstCall).toBe("/api/client/compact");
  });
});

