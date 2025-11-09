import { describe, expect, it } from "vitest";
import { ModeAWebClient } from "./client";

describe("ModeAWebClient", () => {
  it("parses device list", async () => {
    const fetchMock = async () =>
      new Response(
        JSON.stringify([
          { didPseudo: "abc", keyVersion: "v1", latest: { supplyC: 40, returnC: 35, timestamp_minute: new Date().toISOString() } },
        ]),
        { status: 200 },
      );
    const client = new ModeAWebClient({ apiBase: "https://example.com" }, fetchMock as any);
    const devices = await client.getDevices();
    expect(devices[0].didPseudo).toEqual("abc");
  });

  it("throws on error responses", async () => {
    const fetchMock = async () => new Response("nope", { status: 500 });
    const client = new ModeAWebClient({ apiBase: "https://example.com" }, fetchMock as any);
    await expect(client.getDevices()).rejects.toThrow(/500/);
  });
});
