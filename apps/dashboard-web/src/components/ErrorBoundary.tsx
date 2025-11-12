import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console so we have basic visibility even without a backend hook.
    console.error("Unhandled error caught by ErrorBoundary", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  onRetry: () => void;
}

export function DefaultErrorFallback({ onRetry }: DefaultErrorFallbackProps) {
  return (
    <div role="alert" className="app-error-boundary">
      <h1>Something went wrong</h1>
      <p>We hit an unexpected issue. Try again, or refresh the page if the problem persists.</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
