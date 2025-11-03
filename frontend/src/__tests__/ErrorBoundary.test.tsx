import type { ErrorInfo } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "../components/ErrorBoundary";

function ProblemChild() {
  throw new Error("Boom");
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the default fallback when a child throws", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("invokes the onError callback with error details", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onError = vi.fn<[Error, ErrorInfo], void>();

    render(
      <ErrorBoundary onError={onError}>
        <ProblemChild />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const [[errorArg, errorInfoArg]] = onError.mock.calls;
    expect(errorArg).toBeInstanceOf(Error);
    expect(errorInfoArg.componentStack).toEqual(expect.any(String));
  });
});
