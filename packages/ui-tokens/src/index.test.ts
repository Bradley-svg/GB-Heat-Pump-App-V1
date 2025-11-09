import { describe, expect, it } from "vitest";
import { getColors, tokens } from "./index";

describe("tokens", () => {
  it("exposes primary color", () => {
    expect(tokens.color.primary).toBe("#39B54A");
  });

  it("returns color sets per mode", () => {
    expect(getColors("dark").background).toBe(tokens.color.dark.background);
  });
});
