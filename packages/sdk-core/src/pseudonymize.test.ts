import { describe, expect, it } from "vitest";
import { pseudonymizeDeviceId, verifyPseudoCollision } from "./pseudonymize";

const KEY = Buffer.from("0123456789abcdef0123456789abcdef", "hex");

describe("pseudonymizeDeviceId", () => {
  it("deterministically hashes a device id", () => {
    const first = pseudonymizeDeviceId("device-001", { key: KEY, keyVersion: "v1" });
    const second = pseudonymizeDeviceId("device-001", { key: KEY, keyVersion: "v1" });
    expect(first.didPseudo).toEqual(second.didPseudo);
  });

  it("allows custom truncation", () => {
    const result = pseudonymizeDeviceId("device-002", { key: KEY, keyVersion: "v1", truncate: 10 });
    expect(result.didPseudo).toHaveLength(10);
  });

  it("throws when inputs missing", () => {
    expect(() => pseudonymizeDeviceId("", { key: KEY, keyVersion: "v1" })).toThrow();
  });
});

describe("verifyPseudoCollision", () => {
  it("detects equal prefixes", () => {
    expect(verifyPseudoCollision("abcdef", "abcdef")).toBe(true);
  });

  it("detects differences", () => {
    expect(verifyPseudoCollision("abcdef", "abcxyz")).toBe(false);
  });
});
