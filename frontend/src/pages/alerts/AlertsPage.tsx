import { useEffect, useMemo, useState } from "react";

import { useApiClient, useCurrentUserState } from "../../app/contexts";
import { Page } from "../../components";
import { formatNumber, formatRelative } from "../../utils/format";
import type { AlertRecord, AlertComment } from "../../types/api";
import {
  listAlertRecords,
  updateAlertLifecycle,
  createAlertComment,
  type AlertLifecycleActionPayload,
} from "../../services/alerts";
import { ApiError } from "../../services/api-client";

type AsyncState = "loading" | "error" | "ready";
type DialogAction = "acknowledge" | "assign" | "resolve" | "comment";

interface ActionDialogState {
  action: DialogAction;
  alertId: string;
  comment: string;
  assignee?: string;
}

interface OptimisticOptions {
  actorEmail: string;
}

function tempId() {
  return `tmp-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

function cloneComments(comments: AlertComment[]): AlertComment[] {
  return comments.map((comment) => ({ ...comment }));
}

function optionalString(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function formatAssigneeMetadata(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function applyLifecycleOptimistic(
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

  const pendingComment = (action: AlertComment["action"], body: string | null, metadata: Record<string, unknown> | null) => ({
    comment_id: tempId(),
    alert_id: alert.alert_id,
    action,
    author_id: options.actorEmail,
    author_email: options.actorEmail,
    body,
    metadata,
    created_at: now,
    pending: true as const,
  });

  switch (payload.action) {
    case "acknowledge": {
      if (copy.status !== "resolved") {
        copy.status = "acknowledged";
      }
      copy.acknowledged_at = now;
      const assignee = optionalString(payload.assignee);
      if (assignee) {
        copy.assigned_to = assignee;
      }
      const commentBody = optionalString(payload.comment);
      const metadata = assignee ? { assignee } : null;
      if (commentBody || metadata) {
        copy.comments = [
          ...copy.comments,
          pendingComment(
            "acknowledge",
            commentBody ?? null,
            metadata,
          ),
        ];
      }
      break;
    }
    case "assign": {
      const assigneeInput = payload.assignee ?? "";
      const assignee = optionalString(assigneeInput) ?? assigneeInput;
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
  }

  return copy;
}

function applyCommentOptimistic(alert: AlertRecord, comment: string, actorEmail: string): AlertRecord {
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

function extractErrorMessage(error: unknown): string {
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

export default function AlertsPage() {
  const api = useApiClient();
  const currentUser = useCurrentUserState();
  const actorEmail = currentUser.user?.email ?? "operator";

  const [state, setState] = useState<AsyncState>("loading");
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ActionDialogState | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    listAlertRecords(api, { limit: 50 })
      .then((payload) => {
        if (cancelled) return;
        setAlerts(payload.items);
        setGeneratedAt(payload.generated_at);
        setState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const stats = useMemo(() => {
    const total = alerts.length;
    const open = alerts.filter((alert) => alert.status === "open").length;
    const acknowledged = alerts.filter((alert) => alert.status === "acknowledged").length;
    const resolved = alerts.filter((alert) => alert.status === "resolved").length;
    return { total, open, acknowledged, resolved };
  }, [alerts]);

  const dialogAlert = dialog ? alerts.find((alert) => alert.alert_id === dialog.alertId) ?? null : null;

  function closeDialog() {
    setDialog(null);
  }

  async function performLifecycleAction(alert: AlertRecord, payload: AlertLifecycleActionPayload) {
    const previous = alerts;
    const optimistic = applyLifecycleOptimistic(alert, payload, { actorEmail });
    setAlerts(previous.map((item) => (item.alert_id === alert.alert_id ? optimistic : item)));
    setPendingAlertId(alert.alert_id);
    setActionError(null);

    try {
      const response = await updateAlertLifecycle(api, alert.alert_id, payload);
      setAlerts((current) =>
        current.map((item) => (item.alert_id === alert.alert_id ? response.alert : item)),
      );
    } catch (error) {
      setAlerts(previous);
      setActionError(extractErrorMessage(error));
      throw error;
    } finally {
      setPendingAlertId(null);
    }
  }

  async function performCommentAction(alert: AlertRecord, comment: string) {
    const trimmed = optionalString(comment);
    if (!trimmed) return;
    const previous = alerts;
    const optimistic = applyCommentOptimistic(alert, trimmed, actorEmail);
    setAlerts(previous.map((item) => (item.alert_id === alert.alert_id ? optimistic : item)));
    setPendingAlertId(alert.alert_id);
    setActionError(null);

    try {
      const response = await createAlertComment(api, alert.alert_id, trimmed);
      setAlerts((current) =>
        current.map((item) => (item.alert_id === alert.alert_id ? response.alert : item)),
      );
    } catch (error) {
      setAlerts(previous);
      setActionError(extractErrorMessage(error));
      throw error;
    } finally {
      setPendingAlertId(null);
    }
  }

  async function submitDialog() {
    if (!dialog || !dialogAlert) return;

    try {
      if (dialog.action === "comment") {
        await performCommentAction(dialogAlert, dialog.comment);
      } else {
        const commentValue = optionalString(dialog.comment);
        const assigneeValue = optionalString(dialog.assignee);
        const payload: AlertLifecycleActionPayload =
          dialog.action === "assign" ?
            {
              action: "assign",
              assignee: assigneeValue ?? "",
              comment: commentValue,
            }
          : dialog.action === "acknowledge" ?
            {
              action: "acknowledge",
              comment: commentValue,
              assignee: assigneeValue,
            }
          : {
              action: "resolve",
              comment: commentValue,
            };

        await performLifecycleAction(dialogAlert, payload);
      }
      closeDialog();
    } catch {
      // keep dialog open so user can retry
    }
  }

  if (state === "loading") {
    return (
      <Page title="Alerts">
        <div className="card">Loading...</div>
      </Page>
    );
  }

  if (state === "error") {
    return (
      <Page title="Alerts">
        <div className="card callout error">Unable to load alerts</div>
      </Page>
    );
  }

  return (
    <Page title="Alerts">
      <div className="grid kpis">
        <div className="card tight">
          <div className="muted">Total</div>
          <div className="large-number">{formatNumber(stats.total, 0)}</div>
        </div>
        <div className="card tight">
          <div className="muted">Open</div>
          <div className="large-number">{formatNumber(stats.open, 0)}</div>
        </div>
        <div className="card tight">
          <div className="muted">Acknowledged</div>
          <div className="large-number">{formatNumber(stats.acknowledged, 0)}</div>
        </div>
        <div className="card tight">
          <div className="muted">Resolved</div>
          <div className="large-number">{formatNumber(stats.resolved, 0)}</div>
        </div>
      </div>

      {generatedAt ? <div className="muted">Last updated {formatRelative(generatedAt)}</div> : null}

      {actionError ? <div className="card callout error">{actionError}</div> : null}

      {dialog && dialogAlert ? (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {dialog.action === "assign"
                ? "Assign Alert"
                : dialog.action === "acknowledge"
                ? "Acknowledge Alert"
                : dialog.action === "resolve"
                ? "Resolve Alert"
                : "Add Comment"}
            </div>
            <button className="button subtle" onClick={closeDialog} type="button">
              Cancel
            </button>
          </div>
          <div className="stack">
            <div>
              <div className="muted">{dialogAlert.device_id}</div>
              <div>{dialogAlert.summary ?? dialogAlert.alert_type}</div>
            </div>
            {dialog.action === "assign" || dialog.action === "acknowledge" ? (
              <label className="stack compact">
                <span className="muted">Assignee (optional)</span>
                <input
                  type="text"
                  value={dialog.assignee ?? ""}
                  onChange={(event) =>
                    setDialog({ ...dialog, assignee: event.target.value })
                  }
                />
              </label>
            ) : null}
            <label className="stack compact">
              <span className="muted">
                {dialog.action === "comment" ? "Comment" : "Comment (optional)"}
              </span>
              <textarea
                rows={4}
                value={dialog.comment}
                onChange={(event) => setDialog({ ...dialog, comment: event.target.value })}
              />
            </label>
            <div className="actions">
              <button
                className="button primary"
                type="button"
                onClick={() => {
                  void submitDialog();
                }}
                disabled={
                  pendingAlertId === dialog.alertId ||
                  (dialog.action === "assign" && !optionalString(dialog.assignee)) ||
                  (dialog.action === "comment" && !optionalString(dialog.comment))
                }
              >
                Confirm
              </button>
              <button className="button subtle" type="button" onClick={closeDialog}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="stack">
        {alerts.length ? (
          alerts.map((alert) => {
            const disabled = pendingAlertId === alert.alert_id;
            return (
              <div key={alert.alert_id} className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">{alert.device_id}</div>
                    {alert.site ? <div className="subdued">{alert.site}</div> : null}
                    <div className="muted">
                      {alert.alert_type} - {alert.severity.toUpperCase()}
                    </div>
                  </div>
                  <span className={`pill${alert.status === "resolved" ? "" : " warn"}`}>
                    {alert.status === "open"
                      ? "Open"
                      : alert.status === "acknowledged"
                      ? "Acknowledged"
                      : "Resolved"}
                  </span>
                </div>
                <div className="stack compact">
                  {alert.summary ? <div>{alert.summary}</div> : null}
                  {alert.description ? (
                    <div className="muted">{alert.description}</div>
                  ) : null}
                  <div className="meta">
                    Created {formatRelative(alert.created_at)}
                    {alert.acknowledged_at ? ` | Ack ${formatRelative(alert.acknowledged_at)}` : null}
                    {alert.resolved_at ? ` | Resolved ${formatRelative(alert.resolved_at)}` : null}
                  </div>
                  <div className="meta">
                    Assigned to {alert.assigned_to ?? "Unassigned"}
                    {alert.resolved_by ? ` | Resolved by ${alert.resolved_by}` : null}
                  </div>

                  <div className="actions">
                    <button
                      className="button subtle"
                      type="button"
                      onClick={() =>
                        setDialog({
                          action: "acknowledge",
                          alertId: alert.alert_id,
                          comment: "",
                          assignee: alert.assigned_to ?? "",
                        })
                      }
                      disabled={disabled || alert.status === "resolved"}
                    >
                      Acknowledge
                    </button>
                    <button
                      className="button subtle"
                      type="button"
                      onClick={() =>
                        setDialog({
                          action: "assign",
                          alertId: alert.alert_id,
                          comment: "",
                          assignee: alert.assigned_to ?? "",
                        })
                      }
                      disabled={disabled}
                    >
                      Assign
                    </button>
                    <button
                      className="button subtle"
                      type="button"
                      onClick={() =>
                        setDialog({
                          action: "resolve",
                          alertId: alert.alert_id,
                          comment: "",
                        })
                      }
                      disabled={disabled || alert.status === "resolved"}
                    >
                      Resolve
                    </button>
                    <button
                      className="button subtle"
                      type="button"
                      onClick={() =>
                        setDialog({
                          action: "comment",
                          alertId: alert.alert_id,
                          comment: "",
                        })
                      }
                      disabled={disabled}
                    >
                      Comment
                    </button>
                  </div>

                  {alert.comments.length ? (
                    <div className="stack compact">
                      <div className="muted">History</div>
                      <ul className="list tight">
                        {alert.comments.map((comment) => (
                          <li key={comment.comment_id} className="list-item">
                            <div>
                              <div className="meta">
                                {comment.action} -{" "}
                                {comment.author_email ?? comment.author_id ?? "unknown"} -{" "}
                                {formatRelative(comment.created_at)}
                                {comment.pending ? " - pending" : ""}
                              </div>
                              {comment.body ? <div>{comment.body}</div> : null}
                              {comment.metadata?.assignee ? (
                                <div className="meta">
                                  Assignee: {formatAssigneeMetadata(comment.metadata.assignee)}
                                </div>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="card">
            <div className="empty">No alerts available</div>
          </div>
        )}
      </div>
    </Page>
  );
}
