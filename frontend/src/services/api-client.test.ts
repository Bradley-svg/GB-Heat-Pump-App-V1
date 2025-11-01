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

  it("supports relative bases without a leading slash", () => {
    expect(join("api", "devices")).toBe("api/devices");
  });

  it("supports root-relative bases", () => {
    expect(join("/api", "devices")).toBe("/api/devices");
  });

  it("prefers absolute paths over the configured base", () => {
    const absolutePath = "https://override.example.com/resource";
    const normalizedBase = normalizeApiBase("https://api.example.com/v1");
    expect(buildUrl(normalizedBase, absolutePath)).toBe(absolutePath);
  });

  it("trims whitespace from the configured base before joining", () => {
    expect(join("  https://api.example.com/base  ", "segment")).toBe("https://api.example.com/base/segment");
  });

  it("preserves query strings on the base when appending paths", () => {
    expect(join("https://api.example.com/v1?token=abc", "telemetry")).toBe(
      "https://api.example.com/v1/telemetry?token=abc",
    );
  });

  it("preserves fragments on the base when appending paths", () => {
    expect(join("https://api.example.com/v1#anchor", "telemetry")).toBe(
      "https://api.example.com/v1/telemetry#anchor",
    );
  });

  it("merges resource query parameters after base parameters", () => {
    expect(join("https://api.example.com/v1?token=abc", "telemetry?limit=10")).toBe(
      "https://api.example.com/v1/telemetry?token=abc&limit=10",
    );
  });

  it("prefers resource fragments when provided", () => {
    expect(join("https://api.example.com/v1#anchor", "telemetry#override")).toBe(
      "https://api.example.com/v1/telemetry#override",
    );
  });

  it("drops bases with unsupported schemes", () => {
    expect(normalizeApiBase("ftp://api.example.com")).toBe("");
  });

  it("rejects javascript schemes", () => {
    expect(normalizeApiBase("javascript:alert(1)")).toBe("");
  });
});
