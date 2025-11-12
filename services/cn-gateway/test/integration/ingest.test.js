import crypto from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../src/server.js";
import { truncateAll } from "../utils/db.js";
const exportRequests = globalThis.__EXPORT_REQUESTS__;
beforeEach(() => {
    truncateAll();
    exportRequests.length = 0;
});
function basePayload() {
    return {
        deviceId: "hp-1",
        seq: 1,
        timestamp: new Date().toISOString(),
        metrics: {
            supplyC: 12.3,
            control_mode: "AUTO"
        }
    };
}
function signBody(payload) {
    return crypto
        .createHmac("sha256", "test-secret")
        .update(JSON.stringify(payload))
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/u, "");
}
function buildSignedHeaders(payload, extra = {}) {
    return {
        "content-type": "application/json",
        ...extra,
        "x-device-signature": signBody(payload)
    };
}
describe("POST /ingest", () => {
    it("queues sanitized payloads", async () => {
        const app = await buildServer();
        const payload = basePayload();
        const response = await app.inject({
            method: "POST",
            url: "/ingest",
            headers: buildSignedHeaders(payload, { "idempotency-key": "req-1" }),
            payload
        });
        expect(response.statusCode).toBe(202);
        const body = response.json();
        expect(body.status).toBe("queued");
        expect(body.didPseudo).toHaveLength(22);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await app.close();
        expect(exportRequests.length).toBeGreaterThan(0);
    });
    it("rejects forbidden content", async () => {
        const app = await buildServer();
        const payload = basePayload();
        payload.deviceId = "hp-1-10.10.10.10";
        const response = await app.inject({
            method: "POST",
            url: "/ingest",
            headers: buildSignedHeaders(payload),
            payload
        });
        expect(response.statusCode).toBe(422);
        await app.close();
    });
    it("rejects missing device signature", async () => {
        const app = await buildServer();
        const payload = basePayload();
        const response = await app.inject({
            method: "POST",
            url: "/ingest",
            payload
        });
        expect(response.statusCode).toBe(401);
        const body = response.json();
        expect(body.message).toBe("device_signature_missing");
        expect(body.statusCode).toBe(401);
        await app.close();
    });
    it("enforces sequence replay protection", async () => {
        const app = await buildServer();
        const payload = basePayload();
        await app.inject({ method: "POST", url: "/ingest", payload, headers: buildSignedHeaders(payload) });
        const second = await app.inject({ method: "POST", url: "/ingest", payload, headers: buildSignedHeaders(payload) });
        expect(second.statusCode).toBe(409);
        await app.close();
    });
    it("enforces timestamp skew", async () => {
        const app = await buildServer();
        const payload = basePayload();
        payload.timestamp = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const response = await app.inject({ method: "POST", url: "/ingest", payload, headers: buildSignedHeaders(payload) });
        expect(response.statusCode).toBe(422);
        await app.close();
    });
    it("caches idempotent responses", async () => {
        const app = await buildServer();
        const payload = basePayload();
        const first = await app.inject({
            method: "POST",
            url: "/ingest",
            payload,
            headers: buildSignedHeaders(payload, { "idempotency-key": "same" })
        });
        expect(first.statusCode).toBe(202);
        const second = await app.inject({
            method: "POST",
            url: "/ingest",
            payload,
            headers: buildSignedHeaders(payload, { "idempotency-key": "same" })
        });
        expect(second.statusCode).toBe(202);
        expect(second.headers["x-idempotent-replay"]).toBeDefined();
        await app.close();
    });
    it("rate limits chatty devices", async () => {
        const app = await buildServer();
        const payload = basePayload();
        await app.inject({ method: "POST", url: "/ingest", payload, headers: buildSignedHeaders(payload) });
        const secondPayload = { ...payload, seq: 2 };
        await app.inject({ method: "POST", url: "/ingest", payload: secondPayload, headers: buildSignedHeaders(secondPayload) });
        const thirdPayload = { ...payload, seq: 3 };
        const third = await app.inject({
            method: "POST",
            url: "/ingest",
            payload: thirdPayload,
            headers: buildSignedHeaders(thirdPayload)
        });
        expect(third.statusCode).toBe(429);
        await app.close();
    });
});
//# sourceMappingURL=ingest.test.js.map