import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import App from "./App";

describe("Dashboard App", () => {
  it("renders pseudonymization notice", () => {
    render(<App />);
    expect(screen.getByText(/pseudonymous/i)).toBeInTheDocument();
  });
});
