import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const opsPageRender = vi.hoisted(() => vi.fn(() => <div>Ops Mock</div>));
const adminPageRender = vi.hoisted(() => vi.fn(() => <div>Admin Mock</div>));
const adminMqttPageRender = vi.hoisted(() => vi.fn(() => <div>Admin MQTT Mock</div>));
const adminArchivePageRender = vi.hoisted(() => vi.fn(() => <div>Admin Archive Mock</div>));

vi.mock("../pages/ops/OpsPage", () => ({
  default: opsPageRender,
}));

vi.mock("../pages/admin/AdminPage", () => ({
  default: adminPageRender,
}));

vi.mock("../pages/admin/MqttMappingsPage", () => ({
  default: adminMqttPageRender,
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
  adminMqttPageRender.mockClear();
  adminArchivePageRender.mockClear();
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
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
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

    await waitFor(() => expect(screen.queryByText("Ops")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("Admin")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("MQTT")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText("Archives")).not.toBeInTheDocument());
  });

  it("prevents direct Ops routing for non-admins", async () => {
    renderAppShell(["client"]);
    act(() => {
      window.history.pushState({}, "", "/app/ops");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe("/app/compact");
    });
    expect(screen.queryByText("Unauthorized")).not.toBeInTheDocument();
    expect(opsPageRender).not.toHaveBeenCalled();
  });

  it("prevents direct Admin routing for non-admins", async () => {
    renderAppShell(["client"]);
    act(() => {
      window.history.pushState({}, "", "/app/admin");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe("/app/compact");
    });
    expect(screen.queryByText("Unauthorized")).not.toBeInTheDocument();
    expect(adminPageRender).not.toHaveBeenCalled();
  });

  it("prevents direct Admin Archive routing for non-admins", async () => {
    renderAppShell(["client"]);
    act(() => {
      window.history.pushState({}, "", "/app/admin/archive");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe("/app/compact");
    });
    expect(screen.queryByText("Unauthorized")).not.toBeInTheDocument();
    expect(adminArchivePageRender).not.toHaveBeenCalled();
  });

  it("prevents direct Admin MQTT routing for non-admins", async () => {
    renderAppShell(["client"]);
    act(() => {
      window.history.pushState({}, "", "/app/admin/mqtt");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe("/app/compact");
    });
    expect(screen.queryByText("Unauthorized")).not.toBeInTheDocument();
    expect(adminMqttPageRender).not.toHaveBeenCalled();
  });

  it("treats client-admin role as non-admin", async () => {
    renderAppShell(["client-admin"]);
    act(() => {
      window.history.pushState({}, "", "/app/ops");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe("/app/compact");
    });
    expect(screen.queryByText("Unauthorized")).not.toBeInTheDocument();
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

  it("allows admin routes for admins", async () => {
    renderAppShell(["admin"]);
    act(() => {
      window.history.pushState({}, "", "/app/admin");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(adminPageRender).toHaveBeenCalled();
    });
  });

  it("allows admin MQTT route for admins", async () => {
    renderAppShell(["admin"]);
    act(() => {
      window.history.pushState({}, "", "/app/admin/mqtt");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(adminMqttPageRender).toHaveBeenCalled();
    });
    const mqttLink = await screen.findByRole("link", { name: "MQTT" });
    expect(mqttLink).toHaveClass("active");
  });

  it("only marks the nested admin tab active on archive pages", async () => {
    renderAppShell(["admin"], "/app/admin/archive");

    const adminLink = await screen.findByRole("link", { name: "Admin" });
    const mqttLink = await screen.findByRole("link", { name: "MQTT" });
    const archiveLink = await screen.findByRole("link", { name: "Archives" });

    expect(adminLink).not.toHaveClass("active");
    expect(mqttLink).not.toHaveClass("active");
    expect(archiveLink).toHaveClass("active");
  });
});
