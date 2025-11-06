import type { AlertRecord } from "../../../types/api";
import { optionalString } from "../utils";
import type { ActionDialogState } from "../types";

interface ActionDialogProps {
  dialog: ActionDialogState;
  alert: AlertRecord;
  pending: boolean;
  onCancel: () => void;
  onChangeComment: (value: string) => void;
  onChangeAssignee: (value: string) => void;
  onConfirm: () => void;
}

const ACTION_TITLES: Record<ActionDialogState["action"], string> = {
  acknowledge: "Acknowledge Alert",
  assign: "Assign Alert",
  resolve: "Resolve Alert",
  comment: "Add Comment",
};

export function ActionDialog({
  dialog,
  alert,
  pending,
  onCancel,
  onChangeComment,
  onChangeAssignee,
  onConfirm,
}: ActionDialogProps) {
  const confirmDisabled =
    pending || (dialog.action === "comment" && !optionalString(dialog.comment));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{ACTION_TITLES[dialog.action]}</div>
        <button className="button subtle" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
      <div className="stack">
        <div>
          <div className="muted">{alert.device_id}</div>
          <div>{alert.summary ?? alert.alert_type}</div>
        </div>
        {dialog.action === "assign" || dialog.action === "acknowledge" ? (
          <label className="stack compact">
            <span className="muted">Assignee (optional)</span>
            <input
              type="text"
              value={dialog.assignee ?? ""}
              onChange={(event) => onChangeAssignee(event.target.value)}
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
            onChange={(event) => onChangeComment(event.target.value)}
          />
        </label>
        <div className="actions">
          <button
            className="button primary"
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            Confirm
          </button>
          <button className="button subtle" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
