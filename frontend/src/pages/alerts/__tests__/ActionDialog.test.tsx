import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { AlertRecord } from "../../../types/api";
import { ActionDialog } from "../components/ActionDialog";
import type { ActionDialogState } from "../types";

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
    description: "Inlet sensor reports out-of-range values.",
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

function renderDialog(
  dialog: ActionDialogState,
  props: Partial<React.ComponentProps<typeof ActionDialog>> = {},
) {
  const alert = createAlert();
  const onCancel = vi.fn();
  const onChangeComment = vi.fn();
  const onChangeAssignee = vi.fn();
  const onConfirm = vi.fn();

  render(
    <ActionDialog
      dialog={dialog}
      alert={alert}
      pending={false}
      onCancel={onCancel}
      onChangeComment={onChangeComment}
      onChangeAssignee={onChangeAssignee}
      onConfirm={onConfirm}
      {...props}
    />,
  );

  return { onCancel, onChangeComment, onChangeAssignee, onConfirm };
}

describe("ActionDialog", () => {
  it("renders the appropriate title for comment action", () => {
    renderDialog({ action: "comment", alertId: "alert-1", comment: "" });
    expect(screen.getByText("Add Comment")).toBeInTheDocument();
  });

  it("disables confirm for empty comments when required", () => {
    renderDialog({ action: "comment", alertId: "alert-1", comment: "" });
    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Looks good" } });
    expect(confirmButton).not.toBeDisabled();
  });

  it("handles confirm callback", () => {
    const { onConfirm } = renderDialog({ action: "resolve", alertId: "alert-1", comment: "" });
    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
