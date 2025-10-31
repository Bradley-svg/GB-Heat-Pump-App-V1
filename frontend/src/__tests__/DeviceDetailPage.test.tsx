import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { ApiClientContext } from "../app/contexts";
import DeviceDetailPage from "../pages/device-detail/DeviceDetailPage";
import type { ApiClient } from "../services/api-client";
import type {
  DeviceListResponse,
  TelemetryLatestBatchResponse,
  TelemetrySeriesResponse,
} from "../types/api";

interface LatestBatchRequest {
  devices: string[];
}

function renderWithProviders(
  ui: ReactElement,
  apiClient: ApiClient,
  initialPath: string,
): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ApiClientContext.Provider value={apiClient}>
        <Routes>
          <Route path="/app/device" element={ui} />
        </Routes>
      </ApiClientContext.Provider>
    </MemoryRouter>,
  );
}

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
    const getMock = vi.fn<(path: string) => Promise<DeviceListResponse | TelemetrySeriesResponse>>((path) => {
      if (path.startsWith("/api/devices?")) return Promise.resolve(deviceList);
      if (path.startsWith("/api/telemetry/series")) return Promise.resolve(seriesResponse);
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });
    const postMock = vi.fn<
      (path: string, body: LatestBatchRequest) => Promise<TelemetryLatestBatchResponse>
    >((path, _body) => {
      if (path === "/api/telemetry/latest-batch") return Promise.resolve(latestBatch);
      return Promise.reject(new Error(`Unexpected POST ${path}`));
    });
    const apiClient: ApiClient = {
      get: getMock,
      post: postMock,
    };

    renderWithProviders(<DeviceDetailPage />, apiClient, "/app/device?device=token-1001");

    await screen.findByText("Cape Town Plant");
    await waitFor(() => expect(postMock).toHaveBeenCalled());

    expect(postMock).toHaveBeenCalledWith("/api/telemetry/latest-batch", {
      devices: ["token-1001"],
    });
    const hasSeriesCall = getMock.mock.calls.some((call) => {
      const [path] = call;
      return typeof path === "string" && path.includes("device=token-1001");
    });
    expect(hasSeriesCall).toBe(true);

    expect(screen.getByText("Cape Town Plant")).toBeInTheDocument();
    expect(screen.getByText(/Latest 4\.4 kW/)).toBeInTheDocument();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3); // header + 2 data rows
    expect(within(rows[1]).getByText("3")).toBeInTheDocument();
    expect(within(rows[1]).getByText("4.4")).toBeInTheDocument();
  });

  it("shows an error state when telemetry requests fail", async () => {
    const getMock = vi.fn<(path: string) => Promise<DeviceListResponse | TelemetrySeriesResponse>>((path) => {
      if (path.startsWith("/api/devices?")) return Promise.resolve(deviceList);
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });
    const postMock = vi.fn<
      (path: string, body: LatestBatchRequest) => Promise<TelemetryLatestBatchResponse>
    >((_path, _body) => Promise.reject(new Error("upstream failure")));
    const apiClient: ApiClient = {
      get: getMock,
      post: postMock,
    };

    renderWithProviders(<DeviceDetailPage />, apiClient, "/app/device?device=token-1001");

    await expect(screen.findByText("Unable to load device data")).resolves.toBeInTheDocument();
  });
});
