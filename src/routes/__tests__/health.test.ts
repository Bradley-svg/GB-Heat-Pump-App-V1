import { describe, expect, it } from "vitest";

import { handleHealth } from "../health";

describe("handleHealth", () => {
  it("returns an ok health payload", async () => {
    const res = await handleHealth();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);

    const body = (await res.json()) as { ok: boolean; ts: string };
    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe("string");
    expect(body.ts.length).toBeGreaterThan(10);
  });
});
