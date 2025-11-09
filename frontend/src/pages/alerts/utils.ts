import type { AlertComment, AlertRecord } from "../../types/api";
import type { AlertLifecycleActionPayload } from "../../services/alerts";
import { ApiError } from "../../services/api-client";

export interface OptimisticOptions {
  actorEmail: string;
}

function tempId() {
  return `tmp-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

function cloneComments(comments: AlertComment[]): AlertComment[] {
  return comments.map((comment) => ({ ...comment }));
}

export function optionalString(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeAssigneeInput(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = optionalString(value);
  return trimmed ?? null;
}

export function formatAssigneeMetadata(value: unknown): string {
  if (value === null) return "Unassigned";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function applyLifecycleOptimistic(
  alert: AlertRecord,
  payload: AlertLifecycleActionPayload,
  options: OptimisticOptions,
): AlertRecord {
  const now = new Date().toISOString();
  const copy: AlertRecord = {
    ...alert,
    status: alert.status,
    acknowledged_at: alert.acknowledged_at,
    resolved_at: alert.resolved_at,
    resolved_by: alert.resolved_by,
    assigned_to: alert.assigned_to,
    updated_at: now,
    comments: cloneComments(alert.comments),
  };

  const pendingComment = (
    action: AlertComment["action"],
    body: string | null,
    metadata: Record<string, unknown> | null,
  ): AlertComment => ({
    comment_id: tempId(),
    alert_id: alert.alert_id,
    action,
    author_id: options.actorEmail,
    author_email: options.actorEmail,
    body,
    metadata,
    created_at: now,
    pending: true,
  });

  switch (payload.action) {
    case "acknowledge": {
      if (copy.status !== "resolved") {
        copy.status = "acknowledged";
      }
      copy.acknowledged_at = now;
      const normalizedAssignee = normalizeAssigneeInput(payload.assignee);
      if (typeof normalizedAssignee === "string") {
        copy.assigned_to = normalizedAssignee;
      }
      const commentBody = optionalString(payload.comment);
      const metadata =
        typeof normalizedAssignee === "string" ? { assignee: normalizedAssignee } : null;
      if (commentBody || metadata) {
        copy.comments = [
          ...copy.comments,
          pendingComment("acknowledge", commentBody ?? null, metadata),
        ];
      }
      break;
    }
    case "assign": {
      const assignee = normalizeAssigneeInput(payload.assignee) ?? payload.assignee ?? null;
      copy.assigned_to = assignee;
      const commentBody = optionalString(payload.comment);
      const metadata = assignee ? { assignee } : null;
      if (commentBody || metadata) {
        copy.comments = [
          ...copy.comments,
          pendingComment("assign", commentBody ?? null, metadata),
        ];
      }
      break;
    }
    case "resolve": {
      copy.status = "resolved";
      copy.resolved_at = now;
      copy.resolved_by = options.actorEmail;
      copy.acknowledged_at ??= now;
      const commentBody = optionalString(payload.comment);
      if (commentBody) {
        copy.comments = [
          ...copy.comments,
          pendingComment("resolve", commentBody, null),
        ];
      }
      break;
    }
    default:
      break;
  }

  return copy;
}

export function applyCommentOptimistic(
  alert: AlertRecord,
  comment: string,
  actorEmail: string,
): AlertRecord {
  const now = new Date().toISOString();
  return {
    ...alert,
    updated_at: now,
    comments: [
      ...cloneComments(alert.comments),
      {
        comment_id: tempId(),
        alert_id: alert.alert_id,
        action: "comment",
        author_id: actorEmail,
        author_email: actorEmail,
        body: comment,
        metadata: null,
        created_at: now,
        pending: true,
      },
    ],
  };
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as { error?: string } | null;
    if (body?.error) {
      return body.error;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Request failed";
}
