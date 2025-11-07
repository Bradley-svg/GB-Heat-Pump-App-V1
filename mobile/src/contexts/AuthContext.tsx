import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getSessionCookie, setSessionCookie } from "../services/api-client";
import {
  loginWithCredentials,
  logoutSession,
  type AuthUser,
} from "../services/auth-service";
import {
  clearSessionCookie,
  loadSessionCookie,
  persistSessionCookie,
  persistPendingLogoutCookie,
  loadPendingLogoutCookie,
  clearPendingLogoutCookie,
} from "../services/session-storage";
import { fetchCurrentUser } from "../services/user-service";
import { reportClientEvent } from "../services/telemetry";
import { subscribePendingLogoutWatchers } from "../utils/pending-logout";

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
  const pendingLogoutFlush = useRef(false);

  const flushPendingLogout = useCallback(async () => {
    if (pendingLogoutFlush.current) return;
    pendingLogoutFlush.current = true;
    try {
      const cookie = await loadPendingLogoutCookie();
      if (!cookie) return;
      setSessionCookie(cookie);
      try {
        await logoutSession();
        await clearPendingLogoutCookie();
        void reportClientEvent("auth.pending_logout.drained", undefined, { cookie });
      } catch (err) {
        console.warn("auth.pending_logout_failed", err);
        void reportClientEvent(
          "auth.pending_logout.flush_failed",
          {
            message: err instanceof Error ? err.message : String(err),
          },
          { cookie },
        );
      } finally {
        setSessionCookie(undefined);
      }
    } finally {
      pendingLogoutFlush.current = false;
    }
  }, []);

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
    void flushPendingLogout();
  }, [hydrateFromStorage, flushPendingLogout]);

  useEffect(() => {
    const cleanup = subscribePendingLogoutWatchers(() => {
      void flushPendingLogout();
    });
    return cleanup;
  }, [flushPendingLogout]);

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
    setStatus("authenticating");
    setError(null);
    const activeCookie = getSessionCookie();
    try {
      await logoutSession();
      void reportClientEvent("auth.logout.completed", { mode: "server" }, { cookie: activeCookie ?? undefined });
    } catch (err) {
      if (activeCookie) {
        await persistPendingLogoutCookie(activeCookie);
        void reportClientEvent("auth.pending_logout.queued", undefined, { cookie: activeCookie });
        void flushPendingLogout();
      }
      console.warn("auth.logout_failed", err);
      void reportClientEvent(
        "auth.logout.server_failed",
        {
          message: err instanceof Error ? err.message : String(err),
        },
        { cookie: activeCookie ?? undefined },
      );
    } finally {
      await clearSessionCookie();
      setSessionCookie(undefined);
      setUser(null);
      setStatus("anonymous");
    }
  }, [flushPendingLogout]);

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
