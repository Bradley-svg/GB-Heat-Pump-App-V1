import { describe, expect, it } from "vitest";

import { maskId } from "..";

describe("maskId", () => {
  it("returns empty string for falsy identifiers", () => {
    expect(maskId(null)).toBe("");
    expect(maskId(undefined)).toBe("");
    expect(maskId("")).toBe("");
  });

  it("returns the mask when the identifier is very short", () => {
    expect(maskId("1234")).toBe("***");
    expect(maskId("12")).toBe("***");
  });

  it("preserves the prefix and suffix for longer identifiers", () => {
    expect(maskId("GB-12345")).toBe("GB-***45");
    expect(maskId("DEVICE-ABCDE")).toBe("DEV***DE");
  });
});
