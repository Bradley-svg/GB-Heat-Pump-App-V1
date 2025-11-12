import { linking, sanitizeLinkPath } from "../linking";

describe("sanitizeLinkPath", () => {
  it.each([
    ["alerts", "alerts"],
    ["alerts?foo=bar&token=123", "alerts"],
    ["alerts/../../device", ""],
    ["device?id=abc", "device"],
    ["https://app.greenbro.com/device?foo=bar", "device"],
    ["HTTPS://app.greenbro.com/ALERTS?x=y", "alerts"],
    ["", ""],
    ["/", ""],
  ])("normalizes '%s' to '%s'", (raw, expected) => {
    expect(sanitizeLinkPath(raw)).toBe(expected);
  });

  it("falls back to dashboard for unknown paths", () => {
    expect(sanitizeLinkPath("https://evil.example/malicious")).toBe("");
    expect(sanitizeLinkPath("..%2F..%2Fsecret")).toBe("");
  });
});

describe("linking.getStateFromPath", () => {
  it("returns dashboard state for empty or malicious paths", () => {
    const state = linking.getStateFromPath?.("//../../", linking.config);
    expect(state?.routes?.[0]?.name).toBe("Dashboard");
  });

  it("maps to Alerts when provided with extra query params", () => {
    const state = linking.getStateFromPath?.(
      "alerts?token=123",
      linking.config,
    );
    expect(state?.routes?.[0]?.name).toBe("Alerts");
  });
});
