export type DialogAction = "acknowledge" | "assign" | "resolve" | "comment";

export interface ActionDialogState {
  action: DialogAction;
  alertId: string;
  comment: string;
  assignee?: string;
}
