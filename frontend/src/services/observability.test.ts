import { afterEach, describe, expect, it, vi } from "vitest";

import type { ErrorInfo } from "react";

import type { ApiClient } from "./api-client";
import { reportUiError } from "./observability";
import type { CurrentUserState } from "../app/hooks/use-current-user";

type PostMock = ReturnType<typeof vi.fn>;

function createApiClient(post: PostMock): ApiClient {
  return {
    get: vi.fn(),
    post: post as ApiClient["post"],
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}

const readyUser: CurrentUserState = {
  status: "ready",
  user: { email: "admin@example.com", roles: ["admin"], clientIds: ["tenant-1"] },
  error: null,
  refresh: vi.fn(),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reportUiError", () => {
  it("sends a formatted payload to the observability endpoint", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const apiClient = createApiClient(post);

    const error = new Error("Something went wrong");
    Object.assign(error, { stack: "Error: Something went wrong\n  at ProblemChild (App.tsx:10)" });
    const errorInfo = { componentStack: "in ProblemChild\n    in Boundary" } as ErrorInfo;

    await reportUiError(apiClient, { error, errorInfo, currentUser: readyUser });

    expect(post).toHaveBeenCalledTimes(1);
    const [path, body, options] = post.mock.calls[0] as [string, Record<string, unknown>, RequestInit];
    expect(path).toBe("/api/observability/client-errors");
    expect(body).toMatchObject({
      name: "Error",
      message: "Something went wrong",
      componentStack: errorInfo.componentStack,
      user: {
        email: readyUser.user?.email,
        roles: readyUser.user?.roles,
        clientIds: readyUser.user?.clientIds,
      },
    });
    expect(body.timestamp).toBeDefined();
    expect(options).toMatchObject({ keepalive: true });
  });

  it("swallows delivery errors and logs a warning", async () => {
    const post = vi.fn().mockRejectedValue(new Error("network failure"));
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const apiClient = createApiClient(post);

    const error = new Error("Nope");
    const errorInfo = { componentStack: "in FailingComponent" } as ErrorInfo;

    await reportUiError(apiClient, { error, errorInfo, currentUser: readyUser });

    expect(post).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith("Failed to send UI error report", expect.any(Error));
  });
});
