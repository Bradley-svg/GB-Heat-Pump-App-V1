interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="wrap">
      <div className="card" role="status" aria-live="polite">
        {message}
      </div>
    </div>
  );
}
