import { describe, expect, it } from "vitest";
import { SequenceWindow, isTimestampWithinTolerance, normalizeTimestamp } from "./time";

describe("normalizeTimestamp", () => {
  it("rounds to nearest minute", () => {
    const ts = new Date("2024-05-20T10:30:25.000Z");
    expect(normalizeTimestamp(ts)).toEqual("2024-05-20T10:30:00.000Z");
  });
});

describe("isTimestampWithinTolerance", () => {
  it("detects timestamps in tolerance", () => {
    const ts = new Date(Date.now() - 30000).toISOString();
    expect(isTimestampWithinTolerance(ts, 1)).toBe(true);
  });
});

describe("SequenceWindow", () => {
  it("rejects duplicates within window", () => {
    const window = new SequenceWindow(2);
    expect(window.register(1)).toBe(true);
    expect(window.register(1)).toBe(false);
    expect(window.register(2)).toBe(true);
  });
});
