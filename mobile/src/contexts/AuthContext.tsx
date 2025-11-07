import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { setSessionCookie } from "../services/api-client";
import {
  loginWithCredentials,
  logoutSession,
  type AuthUser,
} from "../services/auth-service";
import {
  clearSessionCookie,
  loadSessionCookie,
  persistSessionCookie,
} from "../services/session-storage";
import { fetchCurrentUser } from "../services/user-service";

type AuthStatus = "loading" | "authenticating" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const hydrateFromStorage = useCallback(async () => {
    const storedCookie = await loadSessionCookie();
    if (!storedCookie) {
      setSessionCookie(undefined);
      setStatus("anonymous");
      setUser(null);
      return;
    }
    setSessionCookie(storedCookie);
    try {
      const me = await fetchCurrentUser();
      setUser(me);
      setStatus("authenticated");
    } catch {
      await clearSessionCookie();
      setSessionCookie(undefined);
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

  const login = useCallback(async (email: string, password: string) => {
    setStatus("authenticating");
    setError(null);
    try {
      const result = await loginWithCredentials({ email, password });
      await persistSessionCookie(result.cookie);
      setSessionCookie(result.cookie);
      setUser(result.user);
      setStatus("authenticated");
      return result.user;
    } catch (err) {
      setStatus("anonymous");
      const message =
        err instanceof Error ? err.message : "Unable to sign in. Try again.";
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    const fallbackStatus: AuthStatus = user ? "authenticated" : "anonymous";
    setStatus("authenticating");
    try {
      await logoutSession();
      await clearSessionCookie();
      setSessionCookie(undefined);
      setUser(null);
      setStatus("anonymous");
      setError(null);
    } catch (err) {
      setStatus(fallbackStatus);
      const message =
        err instanceof Error ? err.message : "Unable to sign out. Try again.";
      setError(message);
      throw err;
    }
  }, [user]);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchCurrentUser();
      setUser(me);
      setStatus("authenticated");
    } catch (err) {
      await clearSessionCookie();
      setSessionCookie(undefined);
      setUser(null);
      setStatus("anonymous");
      throw err;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      error,
      login,
      logout,
      refresh,
    }),
    [user, status, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
