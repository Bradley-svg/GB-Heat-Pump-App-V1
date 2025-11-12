import type { ApiClient } from "./api-client";
import type {
  AlertListResponse,
  UpdateAlertLifecycleResponse,
  CreateAlertCommentResponse,
} from "../types/api";

export interface AlertListQuery {
  status?: string;
  severity?: string;
  limit?: number;
}

export type AlertLifecycleActionPayload =
  | {
      action: "acknowledge";
      comment?: string;
      assignee?: string;
    }
  | {
      action: "assign";
      assignee: string;
      comment?: string;
    }
  | {
      action: "resolve";
      comment?: string;
    };

export async function listAlertRecords(api: ApiClient, query?: AlertListQuery): Promise<AlertListResponse> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.severity) params.set("severity", query.severity);
  if (typeof query?.limit === "number") params.set("limit", String(query.limit));

  const path = params.size ? `/api/alerts?${params.toString()}` : "/api/alerts";
  return api.get<AlertListResponse>(path);
}

export async function updateAlertLifecycle(
  api: ApiClient,
  alertId: string,
  payload: AlertLifecycleActionPayload,
): Promise<UpdateAlertLifecycleResponse> {
  const path = `/api/alerts/${encodeURIComponent(alertId)}`;
  return api.patch<UpdateAlertLifecycleResponse>(path, payload);
}

export async function createAlertComment(
  api: ApiClient,
  alertId: string,
  comment: string,
): Promise<CreateAlertCommentResponse> {
  const path = `/api/alerts/${encodeURIComponent(alertId)}/comments`;
  return api.post<CreateAlertCommentResponse>(path, { comment });
}
