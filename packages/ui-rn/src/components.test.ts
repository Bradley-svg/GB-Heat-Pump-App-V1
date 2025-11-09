import { describe, expect, it } from "vitest";
import { GBButton, GBCard } from "./components";

describe("ui-rn components", () => {
  it("export button", () => {
    expect(typeof GBButton).toBe("function");
    expect(typeof GBCard).toBe("function");
  });
});
