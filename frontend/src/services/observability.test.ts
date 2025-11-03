import { afterEach, describe, expect, it, vi } from "vitest";

import type { ErrorInfo } from "react";

import type { ApiClient, RequestOptions } from "./api-client";
import { reportUiError } from "./observability";
import type { CurrentUserState } from "../app/hooks/use-current-user";

type PostCallArgs = [string, unknown, RequestOptions?];
type PostMock = ReturnType<typeof vi.fn<PostCallArgs, Promise<void>>>;

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
    const post = vi.fn<PostCallArgs, Promise<void>>().mockResolvedValue(undefined);
    const apiClient = createApiClient(post);

    const error = new Error("Something went wrong");
    Object.assign(error, { stack: "Error: Something went wrong\n  at ProblemChild (App.tsx:10)" });
    const errorInfo: ErrorInfo = { componentStack: "in ProblemChild\n    in Boundary" };

    await reportUiError(apiClient, { error, errorInfo, currentUser: readyUser });

    expect(post).toHaveBeenCalledTimes(1);
    const [[path, body, options]] = post.mock.calls;
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
    expect(body).toHaveProperty("timestamp");
    expect(options).toMatchObject({ keepalive: true });
  });

  it("swallows delivery errors and logs a warning", async () => {
    const post = vi.fn<PostCallArgs, Promise<void>>().mockRejectedValue(new Error("network failure"));
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const apiClient = createApiClient(post);

    const error = new Error("Nope");
    const errorInfo: ErrorInfo = { componentStack: "in FailingComponent" };

    await reportUiError(apiClient, { error, errorInfo, currentUser: readyUser });

    expect(post).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith("Failed to send UI error report", expect.any(Error));
  });
});
