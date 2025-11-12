import { describe, expect, it } from "vitest";

import { generateToken, hashToken } from "../lib/auth/sessions";

describe("session token helpers", () => {
  it("generates url-safe tokens of configurable length", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);

    const shorter = generateToken(8);
    expect(shorter).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(shorter.length).toBeGreaterThan(8);
  });

  it("produces deterministic hashes for the same token", async () => {
    const token = "sample-token";
    const first = await hashToken(token);
    const second = await hashToken(token);
    expect(first).toEqual(second);
  });
});
