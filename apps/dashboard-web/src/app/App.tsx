import { useCallback, type PropsWithChildren } from "react";
import type { ErrorInfo } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { reportUiError } from "../services/observability";
import { AppProviders } from "./AppProviders";
import { AppShell } from "./AppShell";
import { AuthRoutes } from "../auth/AuthRoutes";
import { useApiClient, useCurrentUserState } from "./contexts";

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppErrorBoundary>
          <Routes>
            <Route path="/auth/*" element={<AuthRoutes />} />
            <Route path="/app/*" element={<AppShell />} />
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </AppErrorBoundary>
      </BrowserRouter>
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
