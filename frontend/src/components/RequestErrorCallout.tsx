import type { ApiRequestErrorInfo } from "../app/hooks/use-api-request";

export interface RequestErrorCalloutProps {
  title: string;
  error: ApiRequestErrorInfo;
  onRetry: () => void;
  retryScheduled: boolean;
  nextRetryInMs: number | null;
  attempts: number;
  busy?: boolean;
}

export function RequestErrorCallout({
  title,
  error,
  onRetry,
  retryScheduled,
  nextRetryInMs,
  attempts,
  busy = false,
}: RequestErrorCalloutProps) {
  const detail = error.description ?? error.message;
  const remainingSeconds =
    retryScheduled && typeof nextRetryInMs === "number" ? Math.max(0, Math.ceil(nextRetryInMs / 1000)) : null;

  const metaParts: string[] = [];
  if (attempts > 0) {
    metaParts.push(`Attempt ${attempts}`);
  }
  if (remainingSeconds !== null) {
    metaParts.push(`Retrying in ${remainingSeconds}s`);
  } else if (!error.retryable) {
    metaParts.push("Auto retry disabled");
  }

  const meta = metaParts.length ? metaParts.join(" \u2022 ") : null;

  return (
    <div className="card callout error">
      <div>
        <strong>{title}</strong>
      </div>
      <div>{detail}</div>
      {error.status ? (
        <div className="muted">{`HTTP status ${error.status}`}</div>
      ) : null}
      {meta ? <div className="muted">{meta}</div> : null}
      <div
        className="mt-1"
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button type="button" className="btn" onClick={onRetry} disabled={busy}>
          {busy ? "Retrying..." : "Retry now"}
        </button>
        {remainingSeconds !== null ? (
          <span className="subdued">{`Next attempt in ${remainingSeconds}s`}</span>
        ) : null}
      </div>
    </div>
  );
}

