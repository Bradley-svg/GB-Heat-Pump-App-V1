import type { AlertRecord } from "../../../types/api";
import { formatRelative } from "../../../utils/format";
import { formatAssigneeMetadata } from "../utils";
import type { DialogAction } from "../types";

interface AlertsListProps {
  alerts: AlertRecord[];
  onAction: (action: DialogAction, alert: AlertRecord) => void;
  isAlertPending: (alertId: string) => boolean;
}

export function AlertsList({ alerts, onAction, isAlertPending }: AlertsListProps) {
  if (!alerts.length) {
    return (
      <div className="card">
        <div className="empty">No alerts available</div>
      </div>
    );
  }

  return (
    <>
      {alerts.map((alert) => {
        const disabled = isAlertPending(alert.alert_id);
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
              {alert.description ? <div className="muted">{alert.description}</div> : null}
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
                  onClick={() => onAction("acknowledge", alert)}
                  disabled={disabled || alert.status === "resolved"}
                >
                  Acknowledge
                </button>
                <button
                  className="button subtle"
                  type="button"
                  onClick={() => onAction("assign", alert)}
                  disabled={disabled}
                >
                  Assign
                </button>
                <button
                  className="button subtle"
                  type="button"
                  onClick={() => onAction("resolve", alert)}
                  disabled={disabled || alert.status === "resolved"}
                >
                  Resolve
                </button>
                <button
                  className="button subtle"
                  type="button"
                  onClick={() => onAction("comment", alert)}
                  disabled={disabled}
                >
                  Comment
                </button>
              </div>

              {alert.comments.length ? (
                <div className="stack compact">
                  <div className="muted">History</div>
                  <ul className="list tight">
                    {alert.comments.map((comment) => {
                      const hasAssigneeMetadata =
                        comment.metadata != null &&
                        Object.prototype.hasOwnProperty.call(comment.metadata, "assignee");
                      const metadataAssignee = hasAssigneeMetadata
                        ? comment.metadata!.assignee
                        : undefined;
                      return (
                        <li key={comment.comment_id} className="list-item">
                          <div>
                            <div className="meta">
                              {comment.action} -{" "}
                              {comment.author_email ?? comment.author_id ?? "unknown"} -{" "}
                              {formatRelative(comment.created_at)}
                              {comment.pending ? " - pending" : ""}
                            </div>
                            {comment.body ? <div>{comment.body}</div> : null}
                            {hasAssigneeMetadata ? (
                              <div className="meta">
                                Assignee: {formatAssigneeMetadata(metadataAssignee)}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}
