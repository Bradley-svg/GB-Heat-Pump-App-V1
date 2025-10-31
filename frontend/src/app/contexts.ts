import { createContext, useContext } from "react";

import type { ApiClient } from "../services/api-client";
import type { AppConfig } from "./config";
import type { CurrentUserState } from "./hooks/use-current-user";

export const AppConfigContext = createContext<AppConfig | null>(null);

export function useAppConfig(): AppConfig {
  const ctx = useContext(AppConfigContext);
  if (!ctx) {
    throw new Error("useAppConfig must be used within an AppConfigContext provider");
  }
  return ctx;
}

export const ApiClientContext = createContext<ApiClient | null>(null);

export function useApiClient(): ApiClient {
  const ctx = useContext(ApiClientContext);
  if (!ctx) {
    throw new Error("useApiClient must be used within an ApiClientContext provider");
  }
  return ctx;
}

export const CurrentUserContext = createContext<CurrentUserState | null>(null);

export function useCurrentUserState(): CurrentUserState {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUserState must be used within a CurrentUserContext provider");
  }
  return ctx;
}
