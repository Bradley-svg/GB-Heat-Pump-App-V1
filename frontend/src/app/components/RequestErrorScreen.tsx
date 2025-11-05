interface RequestErrorScreenProps {
  title?: string;
  message?: string;
  onRetry: () => void;
}

export function RequestErrorScreen({
  title = "Unable to load dashboard",
  message = "We couldn't connect to the server. Please check your connection and try again.",
  onRetry,
}: RequestErrorScreenProps) {
  return (
    <div className="wrap">
      <div className="card callout error" role="alert">
        <h2 className="page-title">{title}</h2>
        <p>{message}</p>
        <button className="btn" type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}
