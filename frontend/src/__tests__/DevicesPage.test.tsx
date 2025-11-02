import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import DevicesPage from "../pages/devices/DevicesPage";
import type { DeviceListResponse } from "../types/api";
import { createApiClientMock, mockApiGet, renderWithApi } from "./testUtils";

function LocationTracker({ onChange }: { onChange: (value: string) => void }) {
  const location = useLocation();

  useEffect(() => {
    onChange(`${location.pathname}${location.search}`);
  }, [location, onChange]);

  return null;
}

describe("DevicesPage", () => {
  it("allows admins to toggle between all devices and assigned scope", async () => {
    const listResponse: DeviceListResponse = { items: [], next: null };
    const getMock = vi.fn().mockImplementation((path: string) => {
      if (path.startsWith("/api/devices")) {
        return Promise.resolve(listResponse);
      }
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });

    const apiClient = createApiClientMock({
      get: mockApiGet(getMock),
    });

    renderWithApi(<DevicesPage />, apiClient, "/app/devices");

    await waitFor(() => expect(getMock).toHaveBeenCalled());

    const firstDevicesCall = getMock.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].startsWith("/api/devices"),
    );
    expect(firstDevicesCall?.[0]).toContain("mine=0");

    fireEvent.click(screen.getByRole("button", { name: /assigned/i }));

    await waitFor(() => {
      const deviceCalls = getMock.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].startsWith("/api/devices"),
      );
      return deviceCalls.length >= 2;
    });

    const deviceCalls = getMock.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].startsWith("/api/devices"),
    );
    expect(deviceCalls[deviceCalls.length - 1][0]).toContain("mine=1");
  });

  it("navigates to device details via Link while preserving query params", async () => {
    const listResponse: DeviceListResponse = {
      items: [
        {
          device_id: "Device 42",
          lookup: "token 42",
          profile_id: "profile-x",
          online: true,
          last_seen_at: "2025-01-01T12:00:00.000Z",
          site: "HQ",
          firmware: null,
          map_version: null,
        },
      ],
      next: null,
    };
    const getMock = vi.fn().mockImplementation((path: string) => {
      if (path.startsWith("/api/devices")) {
        return Promise.resolve(listResponse);
      }
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });
    const apiClient = createApiClientMock({
      get: mockApiGet(getMock),
    });
    const locations: string[] = [];

    renderWithApi(
      <>
        <LocationTracker onChange={(value) => locations.push(value)} />
        <DevicesPage />
      </>,
      apiClient,
      "/app/devices",
    );

    await waitFor(() => expect(getMock).toHaveBeenCalled());

    const link = await screen.findByRole("link", { name: "Device 42" });
    fireEvent.click(link);

    await waitFor(() => expect(locations).toContain("/app/device?device=token%2042"));
    expect(locations[0]).toBe("/app/devices");
    expect(locations[locations.length - 1]).toBe("/app/device?device=token%2042");
  });
});
