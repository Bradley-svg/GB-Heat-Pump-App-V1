import { describe, expect, it } from "vitest";

import {
  deserializePasswordHash,
  hashPassword,
  serializePasswordHash,
  verifyPassword,
} from "../lib/auth/password";

describe("password hashing utilities", () => {
  it("hashes and verifies passwords using PBKDF2", async () => {
    const record = await hashPassword("SuperSecure1!");
    expect(record.hash.byteLength).toBeGreaterThan(0);
    expect(record.salt.byteLength).toBeGreaterThan(0);
    expect(record.iterations).toBeGreaterThan(0);

    await expect(verifyPassword("SuperSecure1!", record)).resolves.toBe(true);
    await expect(verifyPassword("WrongPassword", record)).resolves.toBe(false);
  });

  it("serializes to base64 and restores losslessly", async () => {
    const record = await hashPassword("AnotherSecret!");
    const serialized = serializePasswordHash(record);
    const restored = deserializePasswordHash(serialized);

    expect(restored.iterations).toEqual(record.iterations);
    expect(Buffer.from(restored.hash).toString("hex")).toEqual(
      Buffer.from(record.hash).toString("hex"),
    );
    expect(Buffer.from(restored.salt).toString("hex")).toEqual(
      Buffer.from(record.salt).toString("hex"),
    );
  });
});
