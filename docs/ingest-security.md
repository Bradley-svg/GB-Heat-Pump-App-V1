# Ingest Security Controls

The ingest and heartbeat APIs now enforce origin allowlists, HMAC request signing, and
per-device throttling. This guide summarizes the required request headers, available
configuration knobs, and the day-to-day steps for managing devices and allowed origins.

## Request Requirements

- Every POST to `/api/ingest/:profile` and `/api/heartbeat/:profile` **must** include:
  - `Origin` (when sent by browsers) that matches the configured allowlist.
  - `X-GREENBRO-DEVICE-KEY` containing the device's shared secret.
  - `X-GREENBRO-TIMESTAMP` representing the request time (ISO-8601 or Unix epoch).
  - `X-GREENBRO-SIGNATURE` with an HMAC-SHA256 digest of the canonical string
    `${timestamp}.${rawBody}`. The HMAC key is the **SHA-256 hash** stored in
    `devices.device_key_hash`.
- Requests exceeding 256â€¯KB are rejected with `413 Payload too large`.
- Replay protection: timestamps more than `INGEST_SIGNATURE_TOLERANCE_SECS` (default 300s)
  away from the worker clock are rejected.

## Configuring Allowed Origins

Set the comma- or newline-separated allowlist via `INGEST_ALLOWED_ORIGINS`. Examples:

```toml
[vars]
INGEST_ALLOWED_ORIGINS = "https://devices.greenbro.io,https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev"
```

Guidance:

- Provision the value with Wrangler secrets: `printf 'https://devices.greenbro.io,https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev' | wrangler secret put INGEST_ALLOWED_ORIGINS`.
- Keep the allowlist aligned with firmware images shipped to the field; update both sides before rolling out new hardware URLs.

- `*` (default) keeps previous permissive behaviour. Remove it to lock down access.
- Wildcards are supported with the `*.example.com` syntax.
- Requests lacking an `Origin` header (direct device-to-worker calls) are still accepted;
  they receive `Access-Control-Allow-Origin: *` only when the allowlist includes `*`.

Preflight requests (`OPTIONS`) now enforce the same allowlist and return `403` when the
origin is not approved.

## Managing Device Keys

Devices remain managed via the `devices` table:

```sql
INSERT INTO devices (device_id, profile_id, device_key_hash)
VALUES ('hp-0001', 'profile-123', LOWER(HEX(DIGEST('raw-device-key', 'sha256'))));
```

Best practices:

- Rotate keys by updating `device_key_hash` and distributing the new shared secret.
- Remove or clear `device_key_hash` to revoke devices immediately.
- The worker claims unowned devices automatically; verify ownership conflicts through
  `devices.profile_id` after onboarding.

## Generating Signatures

Client devices should:

1. Compute `hashedKey = SHA256(rawDeviceKey)` (hex string, lowercase).
2. Serialize the JSON payload exactly as sent.
3. Choose a timestamp (ISO-8601 recommended) and send it in `X-GREENBRO-TIMESTAMP`.
4. Compute `signature = HMAC_SHA256(hashedKey, timestamp + "." + rawJson)`.
5. Send the hex-encoded signature in `X-GREENBRO-SIGNATURE`.

Example (Node.js):

```ts
const payload = JSON.stringify(body);
const timestamp = new Date().toISOString();
const signature = createHmac("sha256", Buffer.from(hashedKey, "hex"))
  .update(`${timestamp}.${payload}`)
  .digest("hex");
```

## Rate Limiting

Configure device-level throttling with `INGEST_RATE_LIMIT_PER_MIN` (default `120`):

- Set to `0` to disable throttling.
- Values are whole numbers representing max accepted requests per device per minute.
- When the limit is exceeded, the worker returns `429 Rate limit exceeded` and records
  the event in `ops_metrics` for visibility.
- Update the Wrangler secret when firmware cadence changes: `wrangler secret put INGEST_RATE_LIMIT_PER_MIN`.

## Adjusting Signature Tolerance

`INGEST_SIGNATURE_TOLERANCE_SECS` controls the acceptable clock skew (default five
minutes). Increase this for sites with intermittent connectivity or inaccurate device
clocks; decrease it to tighten replay protection.

Rotate the tolerance alongside firmware timestamp tolerance changes via
`wrangler secret put INGEST_SIGNATURE_TOLERANCE_SECS`.

## Testing & Monitoring

- Run `npm test` to execute the new Vitest coverage for allowed, blocked, and throttled
  ingest scenarios (`src/routes/__tests__/ingest.test.ts`).
- Run `npm run test:security` to execute end-to-end safeguards covering signature
  validation and origin allowlisting.
- Inspect `ops_metrics` for `status_code` values of `429`, `401`, or preflight failures
  to monitor abuse or misconfiguration.
- For manual verification, craft curl requests with the required headers; omit the
  signature to confirm the worker rejects the call.
