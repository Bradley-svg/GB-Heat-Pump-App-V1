import { useCallback, type PropsWithChildren } from "react";
import type { ErrorInfo } from "react";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { reportUiError } from "../services/observability";
import { AppProviders } from "./AppProviders";
import { AppShell } from "./AppShell";
import { useApiClient, useCurrentUserState } from "./contexts";

export default function App() {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <AppShell />
      </AppErrorBoundary>
    </AppProviders>
  );
}

function AppErrorBoundary({ children }: PropsWithChildren) {
  const apiClient = useApiClient();
  const currentUser = useCurrentUserState();

  const handleError = useCallback(
    (error: Error, errorInfo: ErrorInfo) => {
      void reportUiError(apiClient, { error, errorInfo, currentUser });
    },
    [apiClient, currentUser],
  );

  return <ErrorBoundary onError={handleError}>{children}</ErrorBoundary>;
}
