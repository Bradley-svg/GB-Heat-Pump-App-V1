import { useEffect, useMemo, useReducer } from "react";

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
  refresh: () => void;
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
  const [version, bumpVersion] = useReducer((v: number) => v + 1, 0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      dispatch({ type: "loading" });
      try {
        const payload = await api.get<CurrentUser>("/api/me");
        if (!cancelled) {
          dispatch({ type: "success", user: normalizeUser(payload) });
        }
      } catch (error) {
        if (!cancelled) {
          const err = error instanceof Error ? error : new Error("Failed to load user profile");
          dispatch({ type: "error", error: err });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [api, version]);

  return useMemo(
    () => ({
      ...state,
      refresh: () => {
        bumpVersion();
      },
    }),
    [state],
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
