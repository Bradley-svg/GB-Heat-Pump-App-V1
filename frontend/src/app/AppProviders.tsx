import type { PropsWithChildren, ReactNode } from "react";
import { Suspense, useMemo } from "react";

import { createApiClient } from "../services/api-client";
import { ApiClientContext, AppConfigContext, CurrentUserContext } from "./contexts";
import { readAppConfig } from "./config";
import { useCurrentUser } from "./hooks/use-current-user";

interface ProvidersProps extends PropsWithChildren {
  suspenseFallback?: ReactNode;
}

export function AppProviders({ children, suspenseFallback = null }: ProvidersProps) {
  const config = useMemo(() => readAppConfig(), []);
  const apiClient = useMemo(() => createApiClient(config), [config]);

  return (
    <AppConfigContext.Provider value={config}>
      <ApiClientContext.Provider value={apiClient}>
        <CurrentUserBoundary fallback={suspenseFallback}>{children}</CurrentUserBoundary>
      </ApiClientContext.Provider>
    </AppConfigContext.Provider>
  );
}

interface CurrentUserBoundaryProps extends PropsWithChildren {
  fallback?: ReactNode;
}

function CurrentUserBoundary({ children, fallback = null }: CurrentUserBoundaryProps) {
  const currentUser = useCurrentUser();

  return (
    <CurrentUserContext.Provider value={currentUser}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </CurrentUserContext.Provider>
  );
}
