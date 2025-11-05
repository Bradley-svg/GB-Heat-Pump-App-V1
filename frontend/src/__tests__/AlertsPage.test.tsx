import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AlertsPage from "../pages/alerts/AlertsPage";
import type { ApiClient } from "../services/api-client";
import type { AlertListResponse, AlertRecord } from "../types/api";
import {
  createApiClientMock,
  mockApiGet,
  mockApiPost,
  renderWithApi,
} from "./testUtils";

function buildAlert(partial?: Partial<AlertRecord>): AlertRecord {
  return {
    alert_id: "alert-1",
    device_id: "dev-1001",
    lookup: "lookup-1001",
    profile_id: "profile-west",
    site: "Cape Town",
    alert_type: "low_flow",
    severity: "warning",
    status: "open",
    summary: "Low flow detected",
    description: "Flow below threshold",
    metadata: null,
    acknowledged_at: null,
    resolved_at: null,
    resolved_by: null,
    assigned_to: null,
    created_at: "2025-01-02T08:50:00.000Z",
    updated_at: "2025-01-02T08:50:00.000Z",
    comments: [],
    ...partial,
  };
}

describe("AlertsPage", () => {
  it("renders alert list with lifecycle actions", async () => {
    const alert = buildAlert();
    const listResponse: AlertListResponse = {
      generated_at: "2025-01-02T09:00:00.000Z",
      items: [alert],
    };

    const getMock = vi.fn<ApiClient["get"]>().mockResolvedValue(listResponse);
    const apiClient = createApiClientMock({ get: mockApiGet(getMock) });

    renderWithApi(<AlertsPage />, apiClient);

    await screen.findByText("Low flow detected");
    expect(getMock).toHaveBeenCalledWith("/api/alerts?limit=50", undefined);

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Open", { selector: "div.muted" })).toBeInTheDocument();
    expect(screen.getByText("Acknowledged")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Acknowledge" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Assign" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Resolve" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Comment" })).toBeEnabled();
  });

  it("opens comment dialog and posts new comment", async () => {
    const alert = buildAlert();
    const listResponse: AlertListResponse = {
      generated_at: "2025-01-02T09:00:00.000Z",
      items: [alert],
    };

    const updatedAlert: AlertRecord = {
      ...alert,
      comments: [
        {
          comment_id: "comment-1",
          alert_id: alert.alert_id,
          action: "comment",
          author_id: "admin@example.com",
          author_email: "admin@example.com",
          body: "Investigating",
          metadata: null,
          created_at: "2025-01-02T09:05:00.000Z",
        },
      ],
    };

    const getMock = vi.fn<ApiClient["get"]>().mockResolvedValue(listResponse);
    const postMock = vi
      .fn<ApiClient["post"]>()
      .mockResolvedValue({ ok: true, alert: updatedAlert, comment: updatedAlert.comments[0] });
    const apiClient = createApiClientMock({
      get: mockApiGet(getMock),
      post: mockApiPost(postMock),
    });

    renderWithApi(<AlertsPage />, apiClient);

    const commentButton = await screen.findByRole("button", { name: "Comment" });
    await userEvent.click(commentButton);

    const textarea = screen.getByLabelText("Comment");
    await userEvent.type(textarea, "Investigating");

    const confirm = screen.getByRole("button", { name: "Confirm" });
    await userEvent.click(confirm);

    await screen.findByText("Investigating");
    expect(postMock).toHaveBeenCalledWith(
      "/api/alerts/alert-1/comments",
      { comment: "Investigating" },
      undefined,
    );
  });

  it("shows an error when the alert list request fails", async () => {
    const getMock = vi.fn<ApiClient["get"]>().mockRejectedValue(new Error("boom"));
    const apiClient = createApiClientMock({ get: mockApiGet(getMock) });

    renderWithApi(<AlertsPage />, apiClient);

    await screen.findByText("Unable to load alerts");
    expect(getMock).toHaveBeenCalledTimes(1);
  });
});
