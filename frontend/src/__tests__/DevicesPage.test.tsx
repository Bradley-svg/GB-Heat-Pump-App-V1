import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Outlet, RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import DevicesPage from "../pages/devices/DevicesPage";
import type { DeviceListResponse } from "../types/api";
import { ApiClientContext, CurrentUserContext } from "../app/contexts";
import type { CurrentUserState } from "../app/hooks/use-current-user";
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

  it("navigates to device details via Link while preserving query params and basename", async () => {
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
    const userState: CurrentUserState = {
      status: "ready",
      user: { email: "admin@example.com", roles: ["admin"], clientIds: [] },
      error: null,
      refresh: vi.fn(),
    };
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <ApiClientContext.Provider value={apiClient}>
              <CurrentUserContext.Provider value={userState}>
                <Outlet />
              </CurrentUserContext.Provider>
            </ApiClientContext.Provider>
          ),
          children: [
            { path: "devices", element: <DevicesPage /> },
            { path: "device", element: <div /> },
          ],
        },
      ],
      {
        initialEntries: ["/app/devices"],
        basename: "/app",
        future: { v7_relativeSplatPath: true, v7_startTransition: true },
      },
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(getMock).toHaveBeenCalled());

    const link = await screen.findByRole("link", { name: "Device 42" });
    expect(link).toHaveAttribute("href", "/app/device?device=token%2042");
    fireEvent.click(link);

    await waitFor(() =>
      expect(`${router.state.location.pathname}${router.state.location.search}`).toBe(
        "/app/device?device=token%2042",
      ),
    );
  });

  it("aborts list requests when the component unmounts mid-fetch", async () => {
    const listDeferred = createDeferred<DeviceListResponse>();
    void listDeferred.promise.catch(() => undefined);
    let capturedSignal: AbortSignal | undefined;

    const getMock = vi.fn().mockImplementation((path: string, options?: { signal?: AbortSignal }) => {
      if (path.startsWith("/api/devices")) {
        capturedSignal = options?.signal;
        return listDeferred.promise;
      }
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });

    const apiClient = createApiClientMock({
      get: mockApiGet(getMock),
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { unmount } = renderWithApi(<DevicesPage />, apiClient, "/app/devices");

    await waitFor(() => expect(getMock).toHaveBeenCalled());

    unmount();

    expect(capturedSignal?.aborted).toBe(true);

    listDeferred.reject(new DOMException("Aborted", "AbortError"));
    await Promise.resolve();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
