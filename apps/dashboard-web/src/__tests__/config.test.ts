import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readAppConfig, resolveReturnUrl } from "../app/config";

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<ReturnType<typeof readAppConfig>>;
  }
}

const originalConfig = window.__APP_CONFIG__;
const originalLocation = window.location;

function mockLocation(href: string) {
  const url = new URL(href);
  const locationMock: Location = {
    ancestorOrigins: (url as any).ancestorOrigins ?? {
      length: 0,
      item: () => null,
      contains: () => false,
    },
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
    hash: url.hash,
    host: url.host,
    hostname: url.hostname,
    href: url.href,
    origin: url.origin,
    pathname: url.pathname,
    port: url.port,
    protocol: url.protocol,
    search: url.search,
  };
  Object.defineProperty(window, "location", {
    configurable: true,
    value: locationMock,
  });
}

describe("readAppConfig returnDefault sanitization", () => {
  beforeEach(() => {
    window.__APP_CONFIG__ = undefined;
    mockLocation("http://localhost/app/");
  });

  afterEach(() => {
    window.__APP_CONFIG__ = originalConfig;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("falls back to the default when returnDefault is cross-origin", () => {
    window.__APP_CONFIG__ = { returnDefault: "https://evil.example/phish" };
    const config = readAppConfig();
    expect(config.returnDefault).toBe("/");
  });

  it("preserves same-origin absolute returnDefault values", () => {
    window.__APP_CONFIG__ = { returnDefault: "http://localhost/success" };
    const config = readAppConfig();
    expect(config.returnDefault).toBe("http://localhost/success");
  });

  it("rejects cross-origin return query parameters", () => {
    window.__APP_CONFIG__ = { returnDefault: "/home" };
    const config = readAppConfig();
    mockLocation("http://localhost/app/?return=https%3A%2F%2Fevil.example%2Ftrap");
    expect(resolveReturnUrl(config)).toBe("/home");
  });
});
