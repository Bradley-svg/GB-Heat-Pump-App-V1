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
  persistTelemetryGrant,
  loadTelemetryGrant,
  clearTelemetryGrant,
} from "../services/session-storage";
import { fetchCurrentUser } from "../services/user-service";
import { reportClientEvent } from "../services/telemetry";
import { getTelemetryGrant, setTelemetryGrant } from "../services/telemetry-auth";
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
      const pending = await loadPendingLogoutCookie();
      if (!pending) return;
      setSessionCookie(pending.cookie);
      try {
        await logoutSession();
        await clearPendingLogoutCookie();
        void reportClientEvent("auth.pending_logout.drained", undefined, {
          tokenOverride: pending.telemetry?.token,
        });
      } catch (err) {
        console.warn("auth.pending_logout_failed", err);
        void reportClientEvent(
          "auth.pending_logout.flush_failed",
          {
            message: err instanceof Error ? err.message : String(err),
          },
          {
            tokenOverride: pending.telemetry?.token,
          },
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
    const storedTelemetry = await loadTelemetryGrant();
    if (!storedCookie) {
      await clearTelemetryGrant();
      setTelemetryGrant(null);
      setSessionCookie(undefined);
      setStatus("anonymous");
      setUser(null);
      return;
    }
    setSessionCookie(storedCookie);
    setTelemetryGrant(storedTelemetry ?? null);
    try {
      const me = await fetchCurrentUser();
      setUser(me);
      setStatus("authenticated");
    } catch {
      await clearSessionCookie();
      await clearTelemetryGrant();
      setTelemetryGrant(null);
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
      if (result.telemetry?.token) {
        setTelemetryGrant(result.telemetry);
        await persistTelemetryGrant(result.telemetry);
      } else {
        setTelemetryGrant(null);
        await clearTelemetryGrant();
      }
      setUser(result.user);
      setStatus("authenticated");
      return result.user;
    } catch (err) {
      setStatus("anonymous");
      await clearTelemetryGrant();
      setTelemetryGrant(null);
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
    const telemetryGrant = getTelemetryGrant();
    try {
      await logoutSession();
      void reportClientEvent(
        "auth.logout.completed",
        { mode: "server" },
        { tokenOverride: telemetryGrant?.token },
      );
    } catch (err) {
      if (activeCookie) {
        await persistPendingLogoutCookie(activeCookie, telemetryGrant ?? null);
        void reportClientEvent("auth.pending_logout.queued", undefined, {
          tokenOverride: telemetryGrant?.token,
        });
        void flushPendingLogout();
      }
      console.warn("auth.logout_failed", err);
      void reportClientEvent(
        "auth.logout.server_failed",
        {
          message: err instanceof Error ? err.message : String(err),
        },
        {
          tokenOverride: telemetryGrant?.token,
        },
      );
    } finally {
      await clearSessionCookie();
      await clearTelemetryGrant();
      setTelemetryGrant(null);
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
      await clearTelemetryGrant();
      setTelemetryGrant(null);
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
