import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const opsPageRender = vi.hoisted(() => vi.fn(() => <div>Ops Mock</div>));

vi.mock("../pages/ops/OpsPage", () => ({
  default: opsPageRender,
}));

import { AppShell } from "../app/AppShell";
import { ApiClientContext, AppConfigContext, CurrentUserContext } from "../app/contexts";
import type { CurrentUserState } from "../app/hooks/use-current-user";
import type { ApiClient } from "../services/api-client";

const defaultConfig = {
  apiBase: "",
  assetBase: "/app/assets/",
  returnDefault: "/",
};

afterEach(() => {
  vi.clearAllMocks();
  opsPageRender.mockClear();
  window.history.replaceState({}, "", "/");
});

function renderAppShell(userRoles: string[], initialPath = "/app/") {
  const userState: CurrentUserState = {
    status: "ready",
    user: { email: "user@example.com", roles: userRoles, clientIds: [] },
    error: null,
    refresh: () => {
      /* noop */
    },
  };

  window.history.replaceState({}, "", initialPath);

  const apiClientStub: ApiClient = {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
  };

  return render(
    <AppConfigContext.Provider value={defaultConfig}>
      <ApiClientContext.Provider value={apiClientStub}>
        <CurrentUserContext.Provider value={userState}>
          <AppShell />
        </CurrentUserContext.Provider>
      </ApiClientContext.Provider>
    </AppConfigContext.Provider>,
  );
}

describe("AppShell role gating", () => {
  it("hides Ops navigation for non-admins", async () => {
    renderAppShell(["client"]);

    await waitFor(() => {
      expect(screen.queryByText("Ops")).not.toBeInTheDocument();
    });
  });

  it("prevents direct Ops routing for non-admins", async () => {
    renderAppShell(["client"]);
    act(() => {
      window.history.pushState({}, "", "/app/ops");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(await screen.findByText("Unauthorized")).toBeInTheDocument();
    expect(opsPageRender).not.toHaveBeenCalled();
  });

  it("treats client-admin role as non-admin", async () => {
    renderAppShell(["client-admin"]);
    act(() => {
      window.history.pushState({}, "", "/app/ops");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(await screen.findByText("Unauthorized")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Ops")).not.toBeInTheDocument();
    });
    expect(opsPageRender).not.toHaveBeenCalled();
  });

  it("shows Ops navigation and route for admins", async () => {
    renderAppShell(["admin"]);
    act(() => {
      window.history.pushState({}, "", "/app/ops");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(await screen.findByText("Ops")).toBeInTheDocument();
    await waitFor(() => {
      expect(opsPageRender).toHaveBeenCalled();
    });
  });
});
