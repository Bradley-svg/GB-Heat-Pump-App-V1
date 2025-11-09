import { describe, expect, it } from "vitest";
import { ModeARNClient } from "./client";

describe("ModeARNClient", () => {
  it("fetches and validates devices", async () => {
    const fetchMock = async () =>
      new Response(
        JSON.stringify([
          { didPseudo: "abc", keyVersion: "v1", latest: { supplyC: 40, returnC: 39, timestamp_minute: new Date().toISOString() } },
        ]),
        { status: 200 },
      );
    const client = new ModeARNClient({ apiBase: "https://example.com", fetchImpl: fetchMock as any });
    const devices = await client.getDevices();
    expect(devices).toHaveLength(1);
  });
});
