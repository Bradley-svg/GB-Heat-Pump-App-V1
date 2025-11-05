import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useApiRequest } from "../../app/hooks/use-api-request";

describe("useApiRequest initial data handling", () => {
  it("treats falsy initial data as ready", async () => {
    const request = vi.fn(() => Promise.resolve(42));
    const { result } = renderHook(() =>
      useApiRequest<number>((_ctx) => request(), { initialData: 0 }),
    );

    expect(result.current.phase).toBe("ready");
    expect(result.current.data).toBe(0);
    expect(result.current.lastUpdatedAt).not.toBeNull();

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.data).toBe(42));
    expect(result.current.phase).toBe("ready");
  });

  it("preserves ready state for empty string initial data", async () => {
    const request = vi.fn(() => Promise.resolve("next"));
    const { result } = renderHook(() =>
      useApiRequest<string>((_ctx) => request(), { initialData: "" }),
    );

    expect(result.current.phase).toBe("ready");
    expect(result.current.data).toBe("");
    expect(result.current.lastUpdatedAt).not.toBeNull();

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.data).toBe("next"));
    expect(result.current.phase).toBe("ready");
  });
});
