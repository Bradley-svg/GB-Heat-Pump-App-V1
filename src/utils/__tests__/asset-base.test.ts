import { describe, expect, it } from "vitest";

import { expandAssetBase, normalizeAssetBase } from "../asset-base";

describe("normalizeAssetBase", () => {
  it("falls back to the default when the source is empty", () => {
    expect(normalizeAssetBase(undefined, "/app/assets/")).toBe("/app/assets/");
  });

  it("ensures absolute URLs retain their query and fragment components", () => {
    const base = "https://cdn.example.com/app/assets?v=42#bundle";
    expect(normalizeAssetBase(base, "/app/assets/")).toBe("https://cdn.example.com/app/assets/?v=42#bundle");
  });

  it("handles protocol-relative CDN URLs", () => {
    expect(normalizeAssetBase("//cdn.example.com/assets", "/app/assets/")).toBe("//cdn.example.com/assets/");
  });

  it("returns root-relative paths with a trailing slash", () => {
    expect(normalizeAssetBase("/custom/assets", "/app/assets/")).toBe("/custom/assets/");
  });

  it("returns relative paths without introducing a leading slash", () => {
    expect(normalizeAssetBase("cdn/assets", "/app/assets/")).toBe("cdn/assets/");
  });
});

describe("expandAssetBase", () => {
  it("joins suffix paths against absolute asset bases", () => {
    expect(expandAssetBase("https://cdn.example.com/assets", "main.js")).toBe(
      "https://cdn.example.com/assets/main.js",
    );
  });

  it("preserves configured query strings when appending suffixes", () => {
    expect(expandAssetBase("https://cdn.example.com/assets?v=1#library", "main.js")).toBe(
      "https://cdn.example.com/assets/main.js?v=1#library",
    );
  });

  it("merges suffix queries ahead of base query parameters", () => {
    expect(expandAssetBase("https://cdn.example.com/assets?v=1", "main.js?locale=fr")).toBe(
      "https://cdn.example.com/assets/main.js?locale=fr&v=1",
    );
  });

  it("prefers suffix fragments over base fragments", () => {
    expect(expandAssetBase("https://cdn.example.com/assets#bundle", "main.js#section")).toBe(
      "https://cdn.example.com/assets/main.js#section",
    );
  });

  it("supports protocol-relative bases", () => {
    expect(expandAssetBase("//cdn.example.com/assets", "app.css")).toBe("//cdn.example.com/assets/app.css");
  });

  it("supports root-relative bases", () => {
    expect(expandAssetBase("/app/assets", "app.css")).toBe("/app/assets/app.css");
  });

  it("supports relative bases", () => {
    expect(expandAssetBase("app/assets", "app.css")).toBe("app/assets/app.css");
  });

  it("falls back to the suffix when the base is empty", () => {
    expect(expandAssetBase("", "main.js")).toBe("main.js");
  });
});
