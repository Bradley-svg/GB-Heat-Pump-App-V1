import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Outlet, RouterProvider, createMemoryRouter } from "react-router-dom";

import DeviceDetailPage from "../pages/device-detail/DeviceDetailPage";
import type { ApiClient } from "../services/api-client";
import { createApiClientMock, mockApiGet, mockApiPost, renderWithApi } from "./testUtils";
import type {
  DeviceListResponse,
  TelemetryLatestBatchResponse,
  TelemetrySeriesResponse,
} from "../types/api";
import { ApiClientContext, CurrentUserContext } from "../app/contexts";
import type { CurrentUserState } from "../app/hooks/use-current-user";

describe("DeviceDetailPage telemetry integration", () => {
  const deviceList: DeviceListResponse = {
    items: [
      {
        device_id: "GB-1001",
        lookup: "token-1001",
        profile_id: "profile-west",
        online: true,
        last_seen_at: "2025-01-02T08:55:00.000Z",
        site: "Cape Town Plant",
        firmware: "1.0.3",
        map_version: "gb-map-v1",
      },
    ],
    next: null,
  };

  const latestBatch: TelemetryLatestBatchResponse = {
    generated_at: "2025-01-02T09:00:00.000Z",
    items: [
      {
        lookup: "token-1001",
        device_id: "GB-1001",
        profile_id: "profile-west",
        site: "Cape Town Plant",
        online: true,
        last_seen_at: "2025-01-02T08:55:00.000Z",
        latest: {
          ts: Date.parse("2025-01-02T08:54:30.000Z"),
          updated_at: "2025-01-02T08:55:00.000Z",
          supplyC: 45.2,
          returnC: 39.8,
          deltaT: 5.4,
          thermalKW: 4.4,
          cop: 3.1,
          mode: "heating",
          flowLps: 0.32,
          powerKW: 1.5,
          faults: [],
        },
      },
    ],
    missing: [],
  };

  const seriesResponse: TelemetrySeriesResponse = {
    generated_at: "2025-01-02T09:00:00.000Z",
    scope: { type: "device", device_id: "GB-1001", lookup: "token-1001" },
    interval_ms: 300_000,
    window: {
      start: "2025-01-02T08:30:00.000Z",
      end: "2025-01-02T09:00:00.000Z",
    },
    metrics: ["thermalKW", "cop", "deltaT", "supplyC", "returnC"],
    series: [
      {
        bucket_start: "2025-01-02T08:40:00.000Z",
        sample_count: 2,
        values: {
          supplyC: { avg: 44.8 },
          returnC: { avg: 39.1 },
          thermalKW: { avg: 4.1 },
          cop: { avg: 3.0 },
        },
      },
      {
        bucket_start: "2025-01-02T08:45:00.000Z",
        sample_count: 3,
        values: {
          supplyC: { avg: 45.2 },
          returnC: { avg: 39.5 },
          thermalKW: { avg: 4.4 },
          cop: { avg: 3.1 },
        },
      },
    ],
  };

  it("renders telemetry details using batch and series endpoints", async () => {
    const getImplementation: ApiClient["get"] = <T,>(path: string) => {
      if (path.startsWith("/api/devices?")) return Promise.resolve(deviceList as T);
      if (path.startsWith("/api/telemetry/series")) return Promise.resolve(seriesResponse as T);
      return Promise.reject<T>(new Error(`Unexpected GET ${path}`));
    };
    const postImplementation: ApiClient["post"] = <T,>(path: string, _body: unknown) => {
      if (path === "/api/telemetry/latest-batch") return Promise.resolve(latestBatch as T);
      return Promise.reject<T>(new Error(`Unexpected POST ${path}`));
    };
    const getMock = vi.fn(getImplementation);
    const postMock = vi.fn(postImplementation);
    const apiClient = createApiClientMock({
      get: mockApiGet(getMock),
      post: mockApiPost(postMock),
    });

    renderWithApi(<DeviceDetailPage />, apiClient, "/app/device?device=token-1001");

    await screen.findByText("Cape Town Plant");
    await waitFor(() => expect(postMock).toHaveBeenCalled());

    const [postPath, postBody, postOptions] = postMock.mock.calls[0] as [
      string,
      unknown,
      { signal?: AbortSignal } | undefined,
    ];
    expect(postPath).toBe("/api/telemetry/latest-batch");
    expect(postBody).toEqual({ devices: ["token-1001"] });
    expect(postOptions?.signal).toBeInstanceOf(AbortSignal);

    const seriesCall = getMock.mock.calls.find((call) => {
      const [path] = call;
      return typeof path === "string" && path.includes("/api/telemetry/series");
    });
    expect(seriesCall).toBeDefined();
    expect(seriesCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
    const devicesCall = getMock.mock.calls.find((call) => {
      const [path] = call;
      return typeof path === "string" && path.startsWith("/api/devices");
    });
    expect(devicesCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(devicesCall?.[0]).toContain("mine=0");
    expect(screen.getByText(/Latest 4\.4 kW/)).toBeInTheDocument();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3); // header + 2 data rows
    expect(within(rows[1]).getByText("3")).toBeInTheDocument();
    expect(within(rows[1]).getByText("4.4")).toBeInTheDocument();
  });

  it("shows an error state when telemetry requests fail", async () => {
    const getImplementation: ApiClient["get"] = <T,>(path: string) => {
      if (path.startsWith("/api/devices?")) return Promise.resolve(deviceList as T);
      return Promise.reject<T>(new Error(`Unexpected GET ${path}`));
    };
    const postImplementation: ApiClient["post"] = <T,>(_path: string, _body: unknown) =>
      Promise.reject<T>(new Error("upstream failure"));
    const getMock = vi.fn(getImplementation);
    const postMock = vi.fn(postImplementation);
    const apiClient = createApiClientMock({
      get: mockApiGet(getMock),
      post: mockApiPost(postMock),
    });

    renderWithApi(<DeviceDetailPage />, apiClient, "/app/device?device=token-1001");

    await expect(screen.findByText("Unable to load device data")).resolves.toBeInTheDocument();
    const devicesCall = getMock.mock.calls.find((call) => {
      const [path] = call;
      return typeof path === "string" && path.startsWith("/api/devices");
    });
    expect(devicesCall?.[0]).toContain("mine=0");
  });

  it("updates selected device when the URL query parameter changes", async () => {
    const listResponse: DeviceListResponse = {
      items: [
        {
          device_id: "GB-1001",
          lookup: "token-1001",
          profile_id: "profile-west",
          online: true,
          last_seen_at: "2025-01-02T08:55:00.000Z",
          site: "Cape Town Plant",
          firmware: "1.0.3",
          map_version: "gb-map-v1",
        },
        {
          device_id: "GB-2002",
          lookup: "token-2002",
          profile_id: "profile-east",
          online: true,
          last_seen_at: "2025-01-02T08:45:00.000Z",
          site: "Johannesburg Plant",
          firmware: "1.0.4",
          map_version: "gb-map-v1",
        },
      ],
      next: null,
    };

    const latestByDevice: Record<string, TelemetryLatestBatchResponse> = {
      "token-1001": latestBatch,
      "token-2002": {
        ...latestBatch,
        items: latestBatch.items.map((item) => ({
          ...item,
          lookup: "token-2002",
          device_id: "GB-2002",
          latest: {
            ...item.latest,
            supplyC: 46.1,
            returnC: 39.2,
            deltaT: 6.9,
            thermalKW: 4.9,
            cop: 3.4,
            powerKW: 1.6,
          },
        })),
      },
    };

    const seriesByDevice: Record<string, TelemetrySeriesResponse> = {
      "token-1001": seriesResponse,
      "token-2002": {
        ...seriesResponse,
        scope: { type: "device", device_id: "GB-2002", lookup: "token-2002" },
        series: seriesResponse.series.map((entry) => ({
          ...entry,
          values: {
            ...entry.values,
            thermalKW: entry.values?.thermalKW ? { avg: (entry.values.thermalKW.avg ?? 0) + 0.3 } : undefined,
          },
        })),
      },
    };

    const getMock = vi.fn<ApiClient["get"]>().mockImplementation((path: string) => {
      if (path.startsWith("/api/devices?")) {
        return Promise.resolve(listResponse);
      }
      if (path.startsWith("/api/telemetry/series")) {
        const url = new URL(path, "https://example.test");
        const lookup = url.searchParams.get("device") ?? "";
        return Promise.resolve(seriesByDevice[lookup] ?? seriesResponse);
      }
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });

    const postMock = vi.fn<ApiClient["post"]>().mockImplementation(
      (path: string, body: unknown, _options?: { signal?: AbortSignal }) => {
        if (path === "/api/telemetry/latest-batch") {
          const lookup = Array.isArray((body as { devices?: string[] }).devices) ?
            (body as { devices?: string[] }).devices?.[0] :
            undefined;
          return Promise.resolve(latestByDevice[lookup ?? "token-1001"] ?? latestBatch);
        }
        return Promise.reject(new Error(`Unexpected POST ${path}`));
      },
    );

    const apiClient = createApiClientMock({
      get: mockApiGet(getMock),
      post: mockApiPost(postMock),
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
          children: [{ path: "device", element: <DeviceDetailPage /> }],
        },
      ],
      {
        initialEntries: ["/app/device?device=token-1001"],
        basename: "/app",
        future: { v7_relativeSplatPath: true, v7_startTransition: true },
      },
    );

    render(<RouterProvider router={router} />);

    const select = await screen.findByLabelText("Device");
    expect(select).toHaveValue("token-1001");

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith(
        "/api/telemetry/latest-batch",
        { devices: ["token-1001"] },
        expect.anything(),
      ),
    );

    await act(async () => {
      await router.navigate("/device?device=token-2002");
    });

    await screen.findByDisplayValue("GB-2002");
    expect(postMock).toHaveBeenLastCalledWith(
      "/api/telemetry/latest-batch",
      { devices: ["token-2002"] },
      expect.anything(),
    );
  });

  it("removes the device query param when the filtered scope has no devices", async () => {
    const listResponse: DeviceListResponse = {
      items: [
        {
          device_id: "GB-1001",
          lookup: "token-1001",
          profile_id: "profile-west",
          online: true,
          last_seen_at: "2025-01-02T08:55:00.000Z",
          site: "Cape Town Plant",
          firmware: "1.0.3",
          map_version: "gb-map-v1",
        },
      ],
      next: null,
    };

    const emptyList: DeviceListResponse = { items: [], next: null };

    const getMock = vi.fn<ApiClient["get"]>().mockImplementation((path: string) => {
      if (path.startsWith("/api/devices?")) {
        const url = new URL(path, "https://example.test");
        const mine = url.searchParams.get("mine");
        return Promise.resolve(mine === "1" ? emptyList : listResponse);
      }
      if (path.startsWith("/api/telemetry/series")) {
        return Promise.resolve(seriesResponse);
      }
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });

    const postMock = vi.fn<ApiClient["post"]>().mockImplementation(
      (path: string, body: unknown, _options?: { signal?: AbortSignal }) => {
        if (path === "/api/telemetry/latest-batch") {
          const lookup = Array.isArray((body as { devices?: string[] }).devices) ?
            (body as { devices?: string[] }).devices?.[0] :
            undefined;
          if (!lookup || lookup === "token-1001") {
            return Promise.resolve(latestBatch);
          }
          return Promise.reject(new Error(`Unexpected lookup ${lookup}`));
        }
        return Promise.reject(new Error(`Unexpected POST ${path}`));
      },
    );

    const apiClient = createApiClientMock({
      get: mockApiGet(getMock),
      post: mockApiPost(postMock),
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
          children: [{ path: "device", element: <DeviceDetailPage /> }],
        },
      ],
      {
        initialEntries: ["/app/device?device=token-1001"],
        basename: "/app",
        future: { v7_relativeSplatPath: true, v7_startTransition: true },
      },
    );

    render(<RouterProvider router={router} />);

    const select = await screen.findByLabelText("Device");
    expect(select).toHaveValue("token-1001");
    await waitFor(() => expect(router.state.location.search).toBe("?device=token-1001"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Assigned" }));

    await waitFor(() =>
      expect(
        getMock.mock.calls.some(([path]) => typeof path === "string" && path.includes("mine=1")),
      ).toBe(true),
    );

    await waitFor(() => expect(router.state.location.search).toBe(""));

    expect(
      postMock.mock.calls.some(
        ([, body]) =>
          Array.isArray((body as { devices?: string[] }).devices) &&
          ((body as { devices?: string[] }).devices ?? [])[0] === "",
      ),
    ).toBe(false);
  });

  it("aborts in-flight telemetry requests when the component unmounts", async () => {
    const telemetrySeriesDeferred = createDeferred<TelemetrySeriesResponse>();
    const latestBatchDeferred = createDeferred<TelemetryLatestBatchResponse>();
    void latestBatchDeferred.promise.catch(() => undefined);
    void telemetrySeriesDeferred.promise.catch(() => undefined);
    let latestBatchSignal: AbortSignal | undefined;
    let seriesSignal: AbortSignal | undefined;

    const getImplementation: ApiClient["get"] = <T,>(path: string, options?: { signal?: AbortSignal }) => {
      if (path.startsWith("/api/devices?")) return Promise.resolve(deviceList as T);
      if (path.startsWith("/api/telemetry/series")) {
        seriesSignal = options?.signal;
        return telemetrySeriesDeferred.promise as Promise<T>;
      }
      return Promise.reject<T>(new Error(`Unexpected GET ${path}`));
    };
    const postImplementation: ApiClient["post"] = <T,>(
      path: string,
      _body: unknown,
      options?: { signal?: AbortSignal },
    ) => {
      if (path === "/api/telemetry/latest-batch") {
        latestBatchSignal = options?.signal;
        return latestBatchDeferred.promise as Promise<T>;
      }
      return Promise.reject<T>(new Error(`Unexpected POST ${path}`));
    };

    const getMock = vi.fn(getImplementation);
    const postMock = vi.fn(postImplementation);
    const apiClient = createApiClientMock({
      get: mockApiGet(getMock),
      post: mockApiPost(postMock),
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const view = renderWithApi(<DeviceDetailPage />, apiClient, "/app/device?device=token-1001");

    await screen.findByText("Cape Town Plant");
    view.unmount();

    expect(latestBatchSignal?.aborted).toBe(true);
    expect(seriesSignal?.aborted).toBe(true);

    latestBatchDeferred.reject(new DOMException("Aborted", "AbortError"));
    telemetrySeriesDeferred.reject(new DOMException("Aborted", "AbortError"));

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

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






