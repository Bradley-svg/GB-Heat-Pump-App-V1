import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DevicesPage from "../pages/devices/DevicesPage";
import type { DeviceListResponse } from "../types/api";
import { createApiClientMock, mockApiGet, renderWithApi } from "./testUtils";

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
});
