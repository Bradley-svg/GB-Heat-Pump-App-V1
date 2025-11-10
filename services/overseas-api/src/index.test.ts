import { describe, expect, it } from "vitest";
import { sign } from "@noble/ed25519";
import { verifyBatchSignature } from "./index";

const encoder = new TextEncoder();
const TEST_PRIV = Uint8Array.from(Buffer.from("5d5f364b70e084d1bce27c8fef2331dfdac06badd7c534dc217446dae3a36d65", "hex"));
const TEST_PUB = "OA2Av2wl9u8Xl7ngeJ8brBCI2TjUG1+4iZIUf33TkyE=";

describe("overseas worker", () => {
  it("validates batch signatures", async () => {
    const payload = {
      batchId: "b1",
      records: [
        {
          didPseudo: "abc123456789",
          keyVersion: "v1",
          timestamp: new Date().toISOString(),
          metrics: {
            supplyC: 40,
            returnC: 35,
            timestamp_minute: new Date().toISOString(),
          },
        },
      ],
    };
    const signature = Buffer.from(await sign(encoder.encode(JSON.stringify(payload)), TEST_PRIV)).toString("base64");
    await expect(verifyBatchSignature(payload, signature, { EXPORT_VERIFY_PUBKEY: TEST_PUB })).resolves.toBeUndefined();
  });
});
