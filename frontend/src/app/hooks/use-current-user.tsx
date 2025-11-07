import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { useApiClient } from "../contexts";

export interface CurrentUser {
  email: string;
  roles: string[];
  clientIds?: string[];
}

export type CurrentUserStatus = "idle" | "loading" | "ready" | "error";

interface State {
  status: CurrentUserStatus;
  user: CurrentUser | null;
  error: Error | null;
}

type Action =
  | { type: "loading" }
  | { type: "success"; user: CurrentUser }
  | { type: "error"; error: Error };

export interface CurrentUserState extends State {
  refresh: () => Promise<void>;
}

const initialState: State = {
  status: "idle",
  user: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return { status: "loading", user: null, error: null };
    case "success":
      return { status: "ready", user: action.user, error: null };
    case "error":
      return { status: "error", user: null, error: action.error };
    default:
      return state;
  }
}

export function useCurrentUser(): CurrentUserState {
  const api = useApiClient();
  const [state, dispatch] = useReducer(reducer, initialState);
  const aliveRef = useRef(true);

  useEffect(() => {
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    dispatch({ type: "loading" });
    try {
      const payload = await api.get<CurrentUser>("/api/me");
      if (!aliveRef.current) {
        return;
      }
      dispatch({ type: "success", user: normalizeUser(payload) });
    } catch (error) {
      if (!aliveRef.current) {
        return;
      }
      const err = error instanceof Error ? error : new Error("Failed to load user profile");
      dispatch({ type: "error", error: err });
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      ...state,
      refresh: () => load(),
    }),
    [state, load],
  );
}

function normalizeUser(payload: CurrentUser): CurrentUser {
  const roles = Array.isArray(payload.roles) ? payload.roles.filter(Boolean) : [];
  const clientIds = Array.isArray(payload.clientIds) ? payload.clientIds.filter(Boolean) : undefined;
  return {
    email: payload.email,
    roles,
    clientIds,
  };
}
