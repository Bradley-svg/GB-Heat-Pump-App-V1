import { describe, expect, it } from "vitest";

import { __testables } from "./api-client";

const { normalizeApiBase, buildUrl } = __testables;

function join(base: string, path: string): string {
  return buildUrl(normalizeApiBase(base), path);
}

describe("createApiClient url joining", () => {
  it("joins relative paths without duplicating slashes when base lacks trailing slash", () => {
    expect(join("https://api.example.com/v1", "devices")).toBe("https://api.example.com/v1/devices");
  });

  it("joins relative paths when base already ends with a slash", () => {
    expect(join("https://api.example.com/v1/", "devices")).toBe("https://api.example.com/v1/devices");
  });

  it("handles absolute api paths that start with a slash", () => {
    expect(join("https://api.example.com", "/api/devices")).toBe("https://api.example.com/api/devices");
  });

  it("avoids inserting duplicate slashes when both base and path include them", () => {
    expect(join("https://api.example.com/", "/api/devices")).toBe("https://api.example.com/api/devices");
  });

  it("collapses repeated trailing slashes in the base", () => {
    expect(join("https://api.example.com/v1///", "/devices")).toBe("https://api.example.com/v1/devices");
  });

  it("returns path untouched when base is empty", () => {
    expect(join("", "/api/devices")).toBe("/api/devices");
  });

  it("prefers absolute paths over the configured base", () => {
    const absolutePath = "https://override.example.com/resource";
    const normalizedBase = normalizeApiBase("https://api.example.com/v1");
    expect(buildUrl(normalizedBase, absolutePath)).toBe(absolutePath);
  });

  it("trims whitespace from the configured base before joining", () => {
    expect(join("  https://api.example.com/base  ", "segment")).toBe("https://api.example.com/base/segment");
  });
});
