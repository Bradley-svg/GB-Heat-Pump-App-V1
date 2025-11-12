import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { appendCollisionSuffix, pseudonymizeDeviceId } from "../../src/crypto/pseudo.js";
const stubAdapter = {
    async signHmacSHA256(input) {
        return crypto.createHmac("sha256", "stub-key").update(input).digest();
    },
    keyVersion() {
        return "test-version";
    }
};
describe("pseudonymizeDeviceId", () => {
    it("produces deterministic pseudonymous IDs", async () => {
        const first = await pseudonymizeDeviceId("device-123", stubAdapter);
        const second = await pseudonymizeDeviceId("device-123", stubAdapter);
        expect(first.didPseudo).toEqual(second.didPseudo);
        expect(first.didPseudo).toHaveLength(22);
    });
    it("generates collision suffix", () => {
        const suffixValue = appendCollisionSuffix("abc", 5);
        expect(suffixValue).toMatch(/^abc[A-Z2-7]{2}$/);
    });
});
//# sourceMappingURL=pseudo.test.js.map