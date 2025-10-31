import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";

import App from "../../app/App";

beforeEach(() => {
  window.history.replaceState(null, "", "/app/overview");
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

  const mockResponse = (body: unknown): Response =>
    ({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body ?? null)),
    }) as Response;

  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => mockFetch(input, mockResponse)));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App accessibility", () => {
  it("renders the overview page without axe violations", async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /overview \(fleet\)/i })).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

function mockFetch(request: RequestInfo | URL, respond: (body: unknown) => Response): Promise<Response> {
  const url = resolveUrl(request);

  if (url.includes("/api/me")) {
    return Promise.resolve(respond({ email: "admin@example.com", roles: ["admin"], clientIds: [] }));
  }

  if (url.includes("/api/fleet/summary")) {
    return Promise.resolve(
      respond({
        devices_total: 10,
        devices_online: 8,
        online_pct: 80,
        avg_cop_24h: 3.2,
        low_deltaT_count_24h: 1,
        max_heartbeat_age_sec: 120,
        window_start_ms: Date.now() - 24 * 60 * 60 * 1000,
        generated_at: new Date().toISOString(),
      }),
    );
  }

  return Promise.resolve(respond({}));
}

function resolveUrl(request: RequestInfo | URL): string {
  if (typeof request === "string") return request;
  if (request instanceof URL) return request.toString();
  return request.url;
}

