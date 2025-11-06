import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { AlertRecord } from "../../../types/api";
import { AlertsList } from "../components/AlertsList";

function createAlert(overrides: Partial<AlertRecord> = {}): AlertRecord {
  return {
    alert_id: "alert-1",
    device_id: "device-1",
    lookup: "lookup",
    profile_id: "profile",
    site: "Site",
    alert_type: "sensor_fault",
    severity: "warning",
    status: "open",
    summary: "Sensor failure detected",
    description: "Details",
    metadata: null,
    acknowledged_at: null,
    resolved_at: null,
    resolved_by: null,
    assigned_to: null,
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: "2025-01-01T00:00:00.000Z",
    comments: [],
    ...overrides,
  };
}

describe("AlertsList", () => {
  it("renders empty state when no alerts", () => {
    render(<AlertsList alerts={[]} isAlertPending={() => false} onAction={vi.fn()} />);
    expect(screen.getByText("No alerts available")).toBeInTheDocument();
  });

  it("invokes action callback when buttons clicked", () => {
    const alert = createAlert();
    const onAction = vi.fn();

    render(
      <AlertsList
        alerts={[alert]}
        isAlertPending={() => false}
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(onAction).toHaveBeenCalledWith("acknowledge", alert);
  });
});
