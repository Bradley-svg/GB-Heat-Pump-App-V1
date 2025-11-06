import { useEffect, useMemo, useState } from "react";

import { useApiClient, useCurrentUserState } from "../../app/contexts";
import { Page } from "../../components";
import { formatNumber, formatRelative } from "../../utils/format";
import type { AlertRecord } from "../../types/api";
import {
  listAlertRecords,
  updateAlertLifecycle,
  createAlertComment,
  type AlertLifecycleActionPayload,
} from "../../services/alerts";
import {
  applyCommentOptimistic,
  applyLifecycleOptimistic,
  extractErrorMessage,
  normalizeAssigneeInput,
  optionalString,
} from "./utils";
import type { ActionDialogState, DialogAction } from "./types";
import { ActionDialog } from "./components/ActionDialog";
import { AlertsList } from "./components/AlertsList";

type AsyncState = "loading" | "error" | "ready";

export default function AlertsPage() {
  const api = useApiClient();
  const currentUser = useCurrentUserState();
  const actorEmail = currentUser.user?.email ?? "operator";

  const [state, setState] = useState<AsyncState>("loading");
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAlerts, setPendingAlerts] = useState<Set<string>>(() => new Set());
  const [dialog, setDialog] = useState<ActionDialogState | null>(null);

  function markAlertPending(alertId: string) {
    setPendingAlerts((current) => {
      if (current.has(alertId)) return current;
      const next = new Set(current);
      next.add(alertId);
      return next;
    });
  }

  function clearAlertPending(alertId: string) {
    setPendingAlerts((current) => {
      if (!current.has(alertId)) return current;
      const next = new Set(current);
      next.delete(alertId);
      return next;
    });
  }

  function isAlertPending(alertId: string) {
    return pendingAlerts.has(alertId);
  }

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
  const isDialogPending = dialog ? isAlertPending(dialog.alertId) : false;

  async function performLifecycleAction(alert: AlertRecord, payload: AlertLifecycleActionPayload) {
    const previous = alerts;
    const optimistic = applyLifecycleOptimistic(alert, payload, { actorEmail });
    setAlerts(previous.map((item) => (item.alert_id === alert.alert_id ? optimistic : item)));
    markAlertPending(alert.alert_id);
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
      clearAlertPending(alert.alert_id);
    }
  }

  async function performCommentAction(alert: AlertRecord, comment: string) {
    const trimmed = optionalString(comment);
    if (!trimmed) return;
    const previous = alerts;
    const optimistic = applyCommentOptimistic(alert, trimmed, actorEmail);
    setAlerts(previous.map((item) => (item.alert_id === alert.alert_id ? optimistic : item)));
    markAlertPending(alert.alert_id);
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
      clearAlertPending(alert.alert_id);
    }
  }

  async function submitDialog() {
    if (!dialog || !dialogAlert) return;

    try {
      if (dialog.action === "comment") {
        await performCommentAction(dialogAlert, dialog.comment);
      } else {
        const commentValue = optionalString(dialog.comment);
        if (dialog.action === "assign") {
          const assigneeValue = normalizeAssigneeInput(dialog.assignee) ?? null;
          const payload: AlertLifecycleActionPayload = {
            action: "assign",
            assignee: assigneeValue,
            comment: commentValue,
          };
          await performLifecycleAction(dialogAlert, payload);
        } else if (dialog.action === "acknowledge") {
          const assigneeValue = normalizeAssigneeInput(dialog.assignee);
          const payload: AlertLifecycleActionPayload = {
            action: "acknowledge",
            comment: commentValue,
            ...(assigneeValue !== undefined ? { assignee: assigneeValue } : {}),
          };
          await performLifecycleAction(dialogAlert, payload);
        } else {
          const payload: AlertLifecycleActionPayload = {
            action: "resolve",
            comment: commentValue,
          };
          await performLifecycleAction(dialogAlert, payload);
        }
      }
      closeDialog();
    } catch {
      // keep dialog open so user can retry
    }
  }

  function handleOpenDialog(action: DialogAction, target: AlertRecord) {
    if (action === "assign" || action === "acknowledge") {
      setDialog({
        action,
        alertId: target.alert_id,
        comment: "",
        assignee: target.assigned_to ?? "",
      });
      return;
    }
    setDialog({
      action,
      alertId: target.alert_id,
      comment: "",
    });
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
        <ActionDialog
          dialog={dialog}
          alert={dialogAlert}
          pending={isDialogPending}
          onCancel={closeDialog}
          onChangeAssignee={(value) => setDialog({ ...dialog, assignee: value })}
          onChangeComment={(value) => setDialog({ ...dialog, comment: value })}
          onConfirm={() => {
            void submitDialog();
          }}
        />
      ) : null}

      <div className="stack">
        <AlertsList
          alerts={alerts}
          isAlertPending={isAlertPending}
          onAction={handleOpenDialog}
        />
      </div>
    </Page>
  );
}
