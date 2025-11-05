import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "../../services/api-client";

type Phase = "loading" | "ready" | "error";

export interface ApiRequestErrorInfo {
  message: string;
  description?: string;
  status?: number;
  cause: unknown;
  retryable: boolean;
}

export interface UseApiRequestBackoffOptions {
  initialDelayMs: number;
  multiplier: number;
  maxDelayMs: number;
}

export interface UseApiRequestOptions<T> {
  initialData?: T | null;
  autoRefreshMs?: number;
  enableAutoRetry?: boolean;
  backoff?: Partial<UseApiRequestBackoffOptions>;
  onSuccess?: (value: T) => void;
  onError?: (error: unknown, info: ApiRequestErrorInfo) => void;
}

export interface UseApiRequestResult<T> {
  phase: Phase;
  data: T | null;
  error: ApiRequestErrorInfo | null;
  isFetching: boolean;
  attempts: number;
  isRetryScheduled: boolean;
  nextRetryInMs: number | null;
  lastUpdatedAt: number | null;
  lastErrorAt: number | null;
  retry: () => void;
  cancelRetry: () => void;
}

interface RequestCycleOptions {
  manual?: boolean;
  silent?: boolean;
  resetAttempts?: boolean;
}

interface InternalState<T> {
  phase: Phase;
  data: T | null;
  error: ApiRequestErrorInfo | null;
  isFetching: boolean;
  attempts: number;
  isRetryScheduled: boolean;
  nextRetryInMs: number | null;
  lastUpdatedAt: number | null;
  lastErrorAt: number | null;
}

type RequestProducer<T> = (context: { signal: AbortSignal }) => Promise<T>;

const DEFAULT_BACKOFF: UseApiRequestBackoffOptions = {
  initialDelayMs: 2_000,
  multiplier: 2,
  maxDelayMs: 30_000,
};

function resolveBackoff(overrides?: Partial<UseApiRequestBackoffOptions>): UseApiRequestBackoffOptions {
  if (!overrides) {
    return DEFAULT_BACKOFF;
  }
  return {
    initialDelayMs: overrides.initialDelayMs ?? DEFAULT_BACKOFF.initialDelayMs,
    multiplier: overrides.multiplier ?? DEFAULT_BACKOFF.multiplier,
    maxDelayMs: overrides.maxDelayMs ?? DEFAULT_BACKOFF.maxDelayMs,
  };
}

function calculateBackoffDelay(attempt: number, options: UseApiRequestBackoffOptions): number {
  const exponent = Math.max(0, attempt - 1);
  const base = options.initialDelayMs * options.multiplier ** exponent;
  return Math.min(options.maxDelayMs, base);
}

function extractDescription(body: unknown): string | undefined {
  if (!body) return undefined;
  if (typeof body === "string") return body;
  if (typeof body === "number" || typeof body === "boolean") {
    return String(body);
  }
  if (typeof body === "object") {
    const candidate =
      (body as Record<string, unknown>).message ??
      (body as Record<string, unknown>).error ??
      (body as Record<string, unknown>).detail ??
      (body as Record<string, unknown>).title;
    return typeof candidate === "string" ? candidate : undefined;
  }
  return undefined;
}

function normalizeError(error: unknown): ApiRequestErrorInfo {
  if (error instanceof ApiError) {
    const description = extractDescription(error.body);
    const retryable = error.status >= 500 || error.status === 429 || error.status === 408;
    return {
      message: `API request failed (${error.status})`,
      description,
      status: error.status,
      cause: error,
      retryable,
    };
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      message: "Request cancelled",
      cause: error,
      retryable: false,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || "Request failed",
      description: typeof error.cause === "string" ? error.cause : undefined,
      cause: error,
      retryable: true,
    };
  }

  return {
    message: "Request failed",
    cause: error,
    retryable: true,
  };
}

export function useApiRequest<T>(
  requestFn: RequestProducer<T>,
  options: UseApiRequestOptions<T> = {},
): UseApiRequestResult<T> {
  const {
    initialData = null,
    autoRefreshMs,
    enableAutoRetry = true,
    backoff: backoffOverrides,
    onSuccess,
    onError,
  } = options;

  const backoff = useMemo(() => resolveBackoff(backoffOverrides), [backoffOverrides]);
  const hasInitialData = initialData !== null && initialData !== undefined;

  const [state, setReactState] = useState<InternalState<T>>(() => ({
    phase: hasInitialData ? "ready" : "loading",
    data: initialData,
    error: null,
    isFetching: false,
    attempts: 0,
    isRetryScheduled: false,
    nextRetryInMs: null,
    lastUpdatedAt: hasInitialData ? Date.now() : null,
    lastErrorAt: null,
  }));

  const stateRef = useRef(state);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryAtRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setState = useCallback(
    (updater: InternalState<T> | ((prev: InternalState<T>) => InternalState<T>)) => {
      setReactState((prev) => {
        const next = typeof updater === "function" ? (updater as (prev: InternalState<T>) => InternalState<T>)(prev) : updater;
        stateRef.current = next;
        return next;
      });
    },
    [],
  );

  const safeSetState = useCallback(
    (updater: InternalState<T> | ((prev: InternalState<T>) => InternalState<T>)) => {
      if (!mountedRef.current) return;
      setState(updater);
    },
    [setState],
  );

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const clearAutoRefresh = useCallback(() => {
    if (autoRefreshTimeoutRef.current) {
      clearTimeout(autoRefreshTimeoutRef.current);
      autoRefreshTimeoutRef.current = null;
    }
  }, []);

  const stopRetrySchedule = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    retryAtRef.current = null;
    clearCountdown();
    safeSetState((prev) => {
      if (!prev.isRetryScheduled && prev.nextRetryInMs === null) {
        return prev;
      }
      return {
        ...prev,
        isRetryScheduled: false,
        nextRetryInMs: null,
      };
    });
  }, [clearCountdown, safeSetState]);

  const startCountdown = useCallback(() => {
    if (!retryAtRef.current) return;
    clearCountdown();
    countdownIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        return;
      }
      const retryAt = retryAtRef.current;
      if (!retryAt) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        return;
      }
      const remaining = Math.max(0, retryAt - Date.now());
      safeSetState((prev) => {
        if (!prev.isRetryScheduled) {
          return prev;
        }
        if (prev.nextRetryInMs === remaining) {
          return prev;
        }
        return {
          ...prev,
          nextRetryInMs: remaining,
        };
      });
      if (remaining <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    }, 250);
  }, [clearCountdown, safeSetState]);

  const startRequest = useCallback(
    (cycleOptions?: RequestCycleOptions) => {
      const manual = Boolean(cycleOptions?.manual);
      const silent = Boolean(cycleOptions?.silent);
      const resetAttempts = cycleOptions?.resetAttempts ?? manual;

      stopRetrySchedule();
      clearAutoRefresh();

      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      const hasExistingData = stateRef.current.data !== null;

      safeSetState((prev) => {
        const next: InternalState<T> = {
          ...prev,
          isFetching: true,
          isRetryScheduled: false,
          nextRetryInMs: null,
        };
        if (resetAttempts) {
          next.attempts = 0;
        }
        if (!silent) {
          next.phase = hasExistingData ? prev.phase : "loading";
          if (!hasExistingData) {
            next.error = null;
          }
        }
        return next;
      });

      requestFn({ signal: controller.signal })
        .then((result) => {
          if (!mountedRef.current) return;
          stopRetrySchedule();
          clearAutoRefresh();
          safeSetState((prev) => ({
            phase: "ready",
            data: result,
            error: null,
            isFetching: false,
            attempts: 0,
            isRetryScheduled: false,
            nextRetryInMs: null,
            lastUpdatedAt: Date.now(),
            lastErrorAt: prev.lastErrorAt,
          }));
          onSuccess?.(result);
          if (autoRefreshMs && autoRefreshMs > 0) {
            autoRefreshTimeoutRef.current = setTimeout(() => {
              startRequest({ silent: true, resetAttempts: true });
            }, autoRefreshMs);
          }
        })
        .catch((error) => {
          if (!mountedRef.current) return;
          if (controller.signal.aborted) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          if (error instanceof Error && error.name === "AbortError") return;

          clearAutoRefresh();

          const normalized = normalizeError(error);
          const previousAttempts = resetAttempts ? 0 : stateRef.current.attempts;
          const nextAttempts = previousAttempts + 1;
          const hasData = stateRef.current.data !== null;
          const nextPhase: Phase = hasData ? "ready" : "error";
          const delay = calculateBackoffDelay(nextAttempts, backoff);
          const shouldScheduleRetry = enableAutoRetry && normalized.retryable;

          safeSetState((prev) => ({
            ...prev,
            phase: nextPhase,
            error: normalized,
            isFetching: false,
            attempts: nextAttempts,
            isRetryScheduled: shouldScheduleRetry,
            nextRetryInMs: shouldScheduleRetry ? delay : null,
            lastErrorAt: Date.now(),
          }));

          onError?.(error, normalized);

          if (shouldScheduleRetry) {
            retryAtRef.current = Date.now() + delay;
            retryTimeoutRef.current = setTimeout(() => {
              retryTimeoutRef.current = null;
              retryAtRef.current = null;
              startRequest({ silent: stateRef.current.data !== null });
            }, delay);
            startCountdown();
          }
        });
    },
    [
      autoRefreshMs,
      backoff,
      clearAutoRefresh,
      enableAutoRetry,
      onError,
      onSuccess,
      requestFn,
      safeSetState,
      startCountdown,
      stopRetrySchedule,
    ],
  );

  const retry = useCallback(() => {
    const hasData = stateRef.current.data !== null;
    startRequest({ manual: true, silent: hasData, resetAttempts: true });
  }, [startRequest]);

  const cancelRetry = useCallback(() => {
    stopRetrySchedule();
  }, [stopRetrySchedule]);

  useEffect(() => {
    startRequest();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      stopRetrySchedule();
      clearAutoRefresh();
    };
  }, [clearAutoRefresh, startRequest, stopRetrySchedule]);

  return {
    phase: state.phase,
    data: state.data,
    error: state.error,
    isFetching: state.isFetching,
    attempts: state.attempts,
    isRetryScheduled: state.isRetryScheduled,
    nextRetryInMs: state.nextRetryInMs,
    lastUpdatedAt: state.lastUpdatedAt,
    lastErrorAt: state.lastErrorAt,
    retry,
    cancelRetry,
  };
}
