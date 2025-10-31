import { afterEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

let cleanupFn: (() => void) | null = null;

function setupDom(url: string) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url });
  const { window } = dom;
  const globals: Record<string, unknown> = {
    window,
    document: window.document,
    navigator: window.navigator,
    location: window.location,
    history: window.history,
    HTMLElement: window.HTMLElement,
  };

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb: FrameRequestCallback) =>
      setTimeout(() => cb(Date.now()), 16) as unknown as number;
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (handle: number) => clearTimeout(handle);
  }

  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }

  return dom;
}

function teardownDom() {
  delete (globalThis as any).window;
  delete (globalThis as any).document;
  delete (globalThis as any).navigator;
  delete (globalThis as any).location;
  delete (globalThis as any).history;
  delete (globalThis as any).HTMLElement;
}

afterEach(() => {
  cleanupFn?.();
  cleanupFn = null;
  vi.restoreAllMocks();
  teardownDom();
});

describe("App accessibility", () => {
  it("renders the overview page without axe violations", async () => {
    setupDom("https://example.com/app/overview");

    const jestDomMatchersModule = await import("@testing-library/jest-dom/matchers");
    const { default: _unused, ...jestDomMatchers } = jestDomMatchersModule as Record<string, unknown>;
    expect.extend(jestDomMatchers as Record<string, any>);

    await import("vitest-axe/extend-expect");
    const axeMatchersModule = await import("vitest-axe/matchers");
    expect.extend(axeMatchersModule as Record<string, any>);

    const [{ render, screen, waitFor, cleanup }, { axe }, { default: App }] = await Promise.all([
      import("@testing-library/react"),
      import("vitest-axe"),
      import("../../App"),
    ]);
    cleanupFn = cleanup;
    vi.spyOn(window.HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    const mockResponse = (body: unknown) =>
      ({
        ok: true,
        json: () => Promise.resolve(body),
      }) as unknown as Response;

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        if (typeof input === "string" && input.endsWith("/api/me")) {
          return Promise.resolve(mockResponse({ roles: ["admin"] }));
        }

        return Promise.resolve(mockResponse({}));
      }),
    );

    const { container } = render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /overview \(fleet\)/i }),
      ).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
