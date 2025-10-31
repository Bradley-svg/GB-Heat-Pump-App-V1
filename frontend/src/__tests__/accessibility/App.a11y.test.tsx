import { render, screen, waitFor } from "@testing-library/react";
import "vitest-axe/extend-expect";
import App from "../../App";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";

describe("App accessibility", () => {
  it("renders the overview page without axe violations", async () => {
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
