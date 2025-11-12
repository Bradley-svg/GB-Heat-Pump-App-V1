import type { PropsWithChildren } from "react";
import { useMemo } from "react";

import { createApiClient } from "../services/api-client";
import { ApiClientContext, AppConfigContext, CurrentUserContext } from "./contexts";
import { readAppConfig } from "./config";
import { useCurrentUser } from "./hooks/use-current-user";

type ProvidersProps = PropsWithChildren;

export function AppProviders({ children }: ProvidersProps) {
  const config = useMemo(() => readAppConfig(), []);
  const apiClient = useMemo(() => createApiClient(config), [config]);

  return (
    <AppConfigContext.Provider value={config}>
      <ApiClientContext.Provider value={apiClient}>
        <CurrentUserBoundary>{children}</CurrentUserBoundary>
      </ApiClientContext.Provider>
    </AppConfigContext.Provider>
  );
}

function CurrentUserBoundary({ children }: PropsWithChildren) {
  const currentUser = useCurrentUser();

  return (
    <CurrentUserContext.Provider value={currentUser}>
      {children}
    </CurrentUserContext.Provider>
  );
}
