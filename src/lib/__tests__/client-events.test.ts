import { describe, expect, it } from "vitest";

import { __testables } from "../client-events";

const { serializeProperties, MAX_PROPERTIES_BYTES } = __testables;

describe("serializeProperties", () => {
  it("returns JSON for payloads within the byte budget", () => {
    const payload = { foo: "bar", count: 1 };
    const serialized = serializeProperties(payload);
    expect(serialized).toBe(JSON.stringify(payload));
  });

  it("returns a truncated metadata object when payloads exceed the byte budget", () => {
    const payload = { note: "A".repeat(MAX_PROPERTIES_BYTES * 2) };
    const serialized = serializeProperties(payload);
    expect(serialized).not.toBeNull();
    const parsed = JSON.parse(serialized!);
    expect(parsed).toMatchObject({
      truncated: true,
      note: expect.stringContaining("properties truncated"),
    });
    expect(parsed.bytes).toBeGreaterThan(MAX_PROPERTIES_BYTES);
    expect(typeof parsed.preview).toBe("string");
    expect(parsed.preview.length).toBeGreaterThan(0);
  });
});
