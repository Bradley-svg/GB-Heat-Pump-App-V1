import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminPage from "../pages/admin/AdminPage";
import type { ApiClient, RequestOptions } from "../services/api-client";
import type { AdminOverviewResponse } from "../types/api";
import { createApiClientMock, mockApiGet, renderWithApi } from "./testUtils";

describe("AdminPage", () => {
  it("renders tenant metrics and recent operations", async () => {
    const response: AdminOverviewResponse = {
      generated_at: "2025-01-02T10:00:00.000Z",
      scope: "admin",
      tenants: [
        { profile_id: "profile-west", device_count: 3, online_count: 2 },
        { profile_id: "profile-east", device_count: 5, online_count: 5 },
      ],
      ops: [
        {
          ts: "2025-01-02T09:55:00.000Z",
          route: "/api/telemetry/latest-batch",
          status_code: 200,
          duration_ms: 142,
          device_id: "dev-1001",
          lookup: "token-1001",
        },
        {
          ts: "2025-01-02T09:54:00.000Z",
          route: "/api/ingest/:profile",
          status_code: 500,
          duration_ms: 320,
          device_id: null,
          lookup: null,
        },
      ],
      ops_summary: {
        200: 3,
        500: 1,
      },
      ops_window: {
        start: "2024-12-03T10:00:00.000Z",
        days: 30,
      },
    };

    const getMock = vi.fn<ApiClient["get"]>().mockResolvedValue(response);
    const apiClient = createApiClientMock({ get: mockApiGet(getMock) });

    renderWithApi(<AdminPage />, apiClient, "/app/admin");

    await screen.findByText("Tenants");
    expect(getMock).toHaveBeenCalledTimes(1);
    const [path, requestOptions] = getMock.mock.calls[0] as [string, RequestOptions | undefined];
    expect(path).toBe("/api/fleet/admin-overview");
    expect(requestOptions?.signal).toBeInstanceOf(AbortSignal);

    const tables = screen.getAllByRole("table");
    const tenantTable = tables[0];
    const opsTable = tables[1];

    const tenantRows = within(tenantTable).getAllByRole("row");
    expect(tenantRows).toHaveLength(3);
    expect(within(tenantRows[1]).getByText("profile-west")).toBeInTheDocument();
    expect(within(tenantRows[2]).getByText("profile-east")).toBeInTheDocument();

    const opsRows = within(opsTable).getAllByRole("row");
    expect(opsRows).toHaveLength(3);
    expect(within(opsRows[1]).getByText("/api/telemetry/latest-batch")).toBeInTheDocument();
    expect(within(opsRows[2]).getByText("/api/ingest/:profile")).toBeInTheDocument();
    const deviceLink = within(opsRows[1]).getByRole("link", { name: "dev-1001" });
    expect(deviceLink).toHaveAttribute("href", "/app/device?device=token-1001");

    expect(screen.getByText(/Status mix: 200: 3/)).toBeInTheDocument();
    expect(screen.getByText(/Window: last 30 days/i)).toBeInTheDocument();
  });

  it("shows an error callout when the admin overview request fails", async () => {
    const getMock = vi.fn<ApiClient["get"]>().mockRejectedValue(new Error("fail"));
    const apiClient = createApiClientMock({ get: mockApiGet(getMock) });

    renderWithApi(<AdminPage />, apiClient, "/app/admin");

    await screen.findByText("Unable to load admin overview");
    expect(getMock).toHaveBeenCalledTimes(1);
    const [path] = getMock.mock.calls[0] as [string, RequestOptions | undefined];
    expect(path).toBe("/api/fleet/admin-overview");
  });
});

