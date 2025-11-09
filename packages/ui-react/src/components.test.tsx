import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "./theme";
import { GBButton, GBCard } from "./components";

describe("ui-react components", () => {
  it("renders button", () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <GBButton>Click</GBButton>
      </ThemeProvider>,
    );
    expect(markup).toContain("Click");
  });

  it("renders card with title", () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <GBCard title="Test">Body</GBCard>
      </ThemeProvider>,
    );
    expect(markup).toContain("Test");
  });
});
