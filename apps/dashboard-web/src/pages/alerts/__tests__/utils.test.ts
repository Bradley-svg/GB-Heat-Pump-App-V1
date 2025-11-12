import { describe, expect, it } from "vitest";

import { ApiError } from "../../../services/api-client";
import type { AlertRecord } from "../../../types/api";
import {
  applyCommentOptimistic,
  applyLifecycleOptimistic,
  extractErrorMessage,
  formatAssigneeMetadata,
  normalizeAssigneeInput,
  optionalString,
} from "../utils";

function createAlert(overrides: Partial<AlertRecord> = {}): AlertRecord {
  return {
    alert_id: "alert-1",
    device_id: "device-1",
    lookup: "lookup-1",
    profile_id: "profile-1",
    site: "Site A",
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

describe("alerts utils", () => {
  it("trims optional strings", () => {
    expect(optionalString(" value ")).toBe("value");
    expect(optionalString("   ")).toBeUndefined();
    expect(optionalString(null)).toBeUndefined();
  });

  it("normalizes assignee input", () => {
    expect(normalizeAssigneeInput(" alice@example.com ")).toBe("alice@example.com");
    expect(normalizeAssigneeInput("")).toBeNull();
    expect(normalizeAssigneeInput(undefined)).toBeUndefined();
  });

  it("formats assignee metadata for known values", () => {
    expect(formatAssigneeMetadata("operator@example.com")).toBe("operator@example.com");
    expect(formatAssigneeMetadata(null)).toBe("Unassigned");
    expect(formatAssigneeMetadata({ team: "ops" })).toBe('{"team":"ops"}');
  });

  it("applies optimistic lifecycle updates for assignments", () => {
    const alert = createAlert();
    const updated = applyLifecycleOptimistic(
      alert,
      {
        action: "assign",
        assignee: "owner@example.com",
        comment: "Taking over.",
      },
      { actorEmail: "admin@example.com" },
    );

    expect(updated.assigned_to).toBe("owner@example.com");
    expect(updated.comments).toHaveLength(1);
    expect(updated.comments[0]?.pending).toBe(true);
    expect(updated.comments[0]?.metadata).toEqual({ assignee: "owner@example.com" });
  });

  it("applies optimistic comment updates", () => {
    const alert = createAlert();
    const updated = applyCommentOptimistic(alert, "Investigating", "tech@example.com");

    expect(updated.comments).toHaveLength(1);
    expect(updated.comments[0]?.body).toBe("Investigating");
    expect(updated.comments[0]?.pending).toBe(true);
  });

  it("extracts error message from ApiError", () => {
    const apiError = new ApiError("Failed", 400, { error: "Bad request" });
    expect(extractErrorMessage(apiError)).toBe("Bad request");

    const genericApiError = new ApiError("Server exploded", 500, null);
    expect(extractErrorMessage(genericApiError)).toBe("Server exploded");
  });

  it("extracts error message from generic errors", () => {
    expect(extractErrorMessage(new Error("Something went wrong"))).toBe("Something went wrong");
    expect(extractErrorMessage("uh oh")).toBe("Request failed");
  });
});
