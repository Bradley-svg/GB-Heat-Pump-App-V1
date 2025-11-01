import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OpsPage from "../pages/ops/OpsPage";
import type { OpsOverviewResponse } from "../types/api";
import { createApiClientMock, renderWithApi } from "./testUtils";

describe("OpsPage", () => {
  const sampleResponse: OpsOverviewResponse = {
    generated_at: "2024-10-10T10:00:00.000Z",
    scope: "admin",
    devices: {
      total: 12,
      online: 9,
      offline: 3,
      offline_ratio: 0.25,
    },
    ops: [
      {
        route: "/api/test",
        status_code: 200,
        count: 120,
        avg_duration_ms: 120.5,
        max_duration_ms: 320.1,
        total_duration_ms: 14460,
      },
    ],
    ops_summary: {
      total_requests: 200,
      server_error_rate: 0.01,
      client_error_rate: 0.03,
      slow_rate: 0.05,
      slow_routes: [
        {
          route: "/api/test",
          status_code: 200,
          avg_duration_ms: 220,
          count: 10,
        },
      ],
      top_server_error_routes: [
        {
          route: "/api/test",
          status_code: 500,
          count: 2,
        },
      ],
    },
    thresholds: {
      error_rate: { warn: 0.02, critical: 0.05 },
      client_error_rate: { warn: 0.08, critical: 0.15 },
      avg_duration_ms: { warn: 1500, critical: 3000 },
    },
    recent: [
      {
        ts: "2024-10-10T09:58:00.000Z",
        route: "/api/test",
        status_code: 200,
        duration_ms: 110,
        device_id: "DEV-1001",
        lookup: "token-1001",
      },
    ],
  };

  it("renders operations metrics when the API responds", async () => {
    const getMock = vi.fn().mockImplementation((path: string) => {
      if (path === "/api/ops/overview") {
        return Promise.resolve(sampleResponse);
      }
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });

    const api = createApiClientMock({ get: getMock });

    renderWithApi(<OpsPage />, api);

    expect(await screen.findByText(/Requests observed/i)).toBeInTheDocument();
    expect(screen.getByText(/Server error rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Route breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Slow routes/i)).toBeInTheDocument();
    expect(screen.getByText(/Server errors/i)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith("/api/ops/overview", expect.anything());
  });

  it("shows an error message when the API call fails", async () => {
    const api = createApiClientMock({
      get: vi.fn().mockRejectedValue(new Error("network failure")),
    });

    renderWithApi(<OpsPage />, api);

    await waitFor(() => {
      expect(screen.getByText(/Unable to load operations metrics/i)).toBeInTheDocument();
    });
  });
});
