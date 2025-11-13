import { act, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const opsPageRender = vi.hoisted(() => vi.fn(() => <div>Ops Mock</div>));
const adminPageRender = vi.hoisted(() => vi.fn(() => <div>Admin Mock</div>));
const adminArchivePageRender = vi.hoisted(() => vi.fn(() => <div>Admin Archive Mock</div>));

vi.mock("../pages/ops/OpsPage", () => ({
  default: opsPageRender,
}));

vi.mock("../pages/admin/AdminPage", () => ({
  default: adminPageRender,
}));

vi.mock("../pages/admin/AdminArchivePage", () => ({
  default: adminArchivePageRender,
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
  adminPageRender.mockClear();
  adminArchivePageRender.mockClear();
  window.history.replaceState({}, "", "/");
});

function renderAppShell(userRoles: string[], initialPath = "/app/") {
  const normalizedRoles = userRoles.map((role) => {
    const lower = role.toLowerCase();
    if (lower === "client-admin" || lower === "client_admin") return "client";
    if (lower === "admin-client" || lower === "admin_client") return "admin";
    return role;
  });
  const userState: CurrentUserState = {
    status: "ready",
    user: { email: "user@example.com", roles: normalizedRoles, clientIds: [] },
    error: null,
    refresh: () => {
      /* noop */
    },
  };

  return renderAppShellWithState(userState, initialPath);
}

function renderAppShellWithState(userState: CurrentUserState, initialPath = "/app/") {
  const apiClientStub: ApiClient = {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  };

  const router = createMemoryRouter(
    [
      {
        path: "/app/*",
        element: <AppShell />,
      },
    ],
    {
      initialEntries: [initialPath],
      future: { v7_relativeSplatPath: true, v7_startTransition: true },
    },
  );

  const utils = render(
    <AppConfigContext.Provider value={defaultConfig}>
      <ApiClientContext.Provider value={apiClientStub}>
        <CurrentUserContext.Provider value={userState}>
          <RouterProvider router={router} />
        </CurrentUserContext.Provider>
      </ApiClientContext.Provider>
    </AppConfigContext.Provider>,
  );

  return { router, ...utils };
}

describe("AppShell role gating", () => {
  it("shows a dashboard loading indicator until the current user resolves", () => {
    renderAppShellWithState({
      status: "loading",
      user: null,
      error: null,
      refresh: () => {
        /* noop */
      },
    });

    expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
  });

  it("treats idle current user state as loading", () => {
    renderAppShellWithState({
      status: "idle",
      user: null,
      error: null,
      refresh: () => {
        /* noop */
      },
    });

    expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
  });

  it("shows unauthorized indicator when the current user fails to load", () => {
    renderAppShellWithState({
      status: "error",
      user: null,
      error: new Error("whoops"),
      refresh: () => {
        /* noop */
      },
    });

    expect(screen.getByRole("heading", { name: "Unable to load dashboard" })).toBeInTheDocument();
  });

  it("hides Ops navigation for non-admins", async () => {
    renderAppShell(["client"]);

    await waitFor(() => expect(screen.queryByText("Ops")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("Admin")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("Archives")).not.toBeInTheDocument());
  });

  it("prevents direct Ops routing for non-admins", async () => {
    const { router } = renderAppShell(["client"]);
    await act(async () => {
      await router.navigate("/app/ops");
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/compact");
    });
    expect(screen.queryByText("Unauthorized")).not.toBeInTheDocument();
    expect(opsPageRender).not.toHaveBeenCalled();
  });

  it("prevents direct Admin routing for non-admins", async () => {
    const { router } = renderAppShell(["client"]);
    await act(async () => {
      await router.navigate("/app/admin");
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/compact");
    });
    expect(screen.queryByText("Unauthorized")).not.toBeInTheDocument();
    expect(adminPageRender).not.toHaveBeenCalled();
  });

  it("prevents direct Admin Archive routing for non-admins", async () => {
    const { router } = renderAppShell(["client"]);
    await act(async () => {
      await router.navigate("/app/admin/archive");
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/compact");
    });
    expect(screen.queryByText("Unauthorized")).not.toBeInTheDocument();
    expect(adminArchivePageRender).not.toHaveBeenCalled();
  });

  it("redirects clients hitting unknown routes back to their landing page", async () => {
    const { router } = renderAppShell(["client"]);
    await act(async () => {
      await router.navigate("/app/unknown");
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/compact");
    });
    expect(screen.queryByRole("heading", { name: "Unauthorized" })).not.toBeInTheDocument();
  });

  it("treats client-admin role as non-admin", async () => {
    const { router } = renderAppShell(["client-admin"]);
    await act(async () => {
      await router.navigate("/app/ops");
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app/compact");
    });
    expect(screen.queryByText("Unauthorized")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Ops")).not.toBeInTheDocument();
    });
    expect(opsPageRender).not.toHaveBeenCalled();
  });

  it("shows Ops navigation and route for admins", async () => {
    const { router } = renderAppShell(["admin"]);
    await act(async () => {
      await router.navigate("/app/ops");
    });

    expect(await screen.findByText("Ops")).toBeInTheDocument();
    await waitFor(() => {
      expect(opsPageRender).toHaveBeenCalled();
    });
  });

  it("allows admin routes for admins", async () => {
    const { router } = renderAppShell(["admin"]);
    await act(async () => {
      await router.navigate("/app/admin");
    });

    await waitFor(() => {
      expect(adminPageRender).toHaveBeenCalled();
    });
  });

  it("only marks the nested admin tab active on archive pages", async () => {
    renderAppShell(["admin"], "/app/admin/archive");

    const adminLink = await screen.findByRole("link", { name: "Admin" });
    const archiveLink = await screen.findByRole("link", { name: "Archives" });

    expect(adminLink).not.toHaveClass("active");
    expect(archiveLink).toHaveClass("active");
  });
});
