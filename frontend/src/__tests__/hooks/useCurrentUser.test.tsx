import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiClientContext } from "../../app/contexts";
import { useCurrentUser } from "../../app/hooks/use-current-user";
import type { ApiClient } from "../../services/api-client";

function renderUseCurrentUser(apiClient: ApiClient) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ApiClientContext.Provider value={apiClient}>{children}</ApiClientContext.Provider>
  );
  return renderHook(() => useCurrentUser(), { wrapper });
}

describe("useCurrentUser", () => {
  it("loads the current user profile and supports refresh", async () => {
    const getMock = vi
      .fn()
      .mockResolvedValueOnce({ email: "admin@example.com", roles: ["admin"], clientIds: ["west"] })
      .mockResolvedValueOnce({ email: "admin@example.com", roles: ["admin"], clientIds: ["west", "east"] });
    const apiClient: ApiClient = {
      get: getMock,
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const { result } = renderUseCurrentUser(apiClient);

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.user).toMatchObject({ email: "admin@example.com", roles: ["admin"] });
    const [path, options] = getMock.mock.calls[0] as [string, { signal?: AbortSignal } | undefined];
    expect(path).toBe("/api/me");
    if (options?.signal) {
      expect(options.signal).toBeInstanceOf(AbortSignal);
    }

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.user?.clientIds).toEqual(["west", "east"]);
  });

  it("surfaces error state when the profile request fails", async () => {
    const getMock = vi.fn().mockRejectedValueOnce(new Error("network-error"));
    const apiClient: ApiClient = {
      get: getMock,
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const { result } = renderUseCurrentUser(apiClient);

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.user).toBeNull();
  });
});

