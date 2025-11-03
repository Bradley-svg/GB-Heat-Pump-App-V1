import type { ErrorInfo } from "react";

import type { CurrentUserState } from "../app/hooks/use-current-user";
import type { ApiClient } from "./api-client";

const OBSERVABILITY_ENDPOINT = "/api/observability/client-errors";
const MAX_STACK_CHARS = 8192;
const MAX_COMPONENT_STACK_CHARS = 8192;
const MAX_MESSAGE_CHARS = 2048;
const MAX_URL_CHARS = 2048;
const MAX_USER_AGENT_CHARS = 1024;

interface ReportUiErrorParams {
  error: Error;
  errorInfo: ErrorInfo;
  currentUser?: CurrentUserState;
}

interface UiErrorReport {
  name?: string;
  message?: string;
  stack?: string;
  componentStack?: string;
  userAgent?: string;
  url?: string;
  timestamp: string;
  release?: string;
  reporterId?: string;
  user?: {
    email?: string;
    roles?: string[];
    clientIds?: string[];
  };
  extras?: Record<string, unknown>;
}

export async function reportUiError(apiClient: ApiClient, params: ReportUiErrorParams): Promise<void> {
  const { error, errorInfo, currentUser } = params;
  const payload: UiErrorReport = {
    name: trimmed(error.name, 256),
    message: truncated(error.message, MAX_MESSAGE_CHARS),
    stack: truncated(error.stack, MAX_STACK_CHARS),
    componentStack: truncated(errorInfo.componentStack, MAX_COMPONENT_STACK_CHARS),
    userAgent: getUserAgent(),
    url: getLocationHref(),
    timestamp: new Date().toISOString(),
    release: getAppRelease(),
    reporterId: maybeRandomId(),
    user: formatUser(currentUser),
    extras: buildExtras(error),
  };

  try {
    await apiClient.post(OBSERVABILITY_ENDPOINT, payload, { keepalive: true });
  } catch (loggingError) {
    console.warn("Failed to send UI error report", loggingError);
  }
}

function truncated(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

function trimmed(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;
  return trimmedValue.length > max ? trimmedValue.slice(0, max) : trimmedValue;
}

function getUserAgent(): string | undefined {
  if (typeof navigator === "undefined" || !navigator.userAgent) {
    return undefined;
  }
  return truncated(navigator.userAgent, MAX_USER_AGENT_CHARS);
}

function getLocationHref(): string | undefined {
  if (typeof window === "undefined" || !window.location) {
    return undefined;
  }
  return truncated(window.location.href, MAX_URL_CHARS);
}

function getAppRelease(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const meta =
    typeof document !== "undefined" ?
      document.querySelector('meta[name="app-release"]') ??
      document.querySelector('meta[name="app-version"]') :
      null;
  const content = meta?.getAttribute("content") ?? undefined;
  return trimmed(content ?? undefined, 128);
}

function maybeRandomId(): string | undefined {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    return undefined;
  }
  return crypto.randomUUID();
}

function formatUser(currentUser?: CurrentUserState) {
  const user = currentUser?.status === "ready" ? currentUser.user : undefined;
  if (!user) {
    return undefined;
  }
  return {
    email: user.email,
    roles: user.roles,
    clientIds: user.clientIds ?? [],
  };
}

function buildExtras(error: Error): Record<string, unknown> | undefined {
  const extras: Record<string, unknown> = {};
  const cause = (error as { cause?: unknown }).cause;
  if (cause !== undefined) {
    extras.cause = serializeCause(cause);
  }
  const meta = (error as { context?: unknown }).context;
  if (meta && typeof meta === "object") {
    extras.context = meta;
  }
  return Object.keys(extras).length ? extras : undefined;
}

function serializeCause(cause: unknown): unknown {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: truncated(cause.stack, MAX_STACK_CHARS),
    };
  }
  return cause;
}
