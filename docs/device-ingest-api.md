# Device Telemetry Ingest & Heartbeat API

This runbook describes how firmware and gateway clients should build requests for the telemetry ingest and heartbeat endpoints, how the backend validates them, and which responses warrant retries.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/ingest/{profileId}` | Store a batch of telemetry metrics for a device that belongs to the given profile. |
| `POST` | `/api/heartbeat/{profileId}` | Mark a device online and refresh last-seen metadata. |

The `{profileId}` path segment must match the profile associated with the device. Devices that have not been claimed yet will be auto-assigned to the supplied profile on the first successful request.

## Required Headers

| Header | Description |
| --- | --- |
| `X-GREENBRO-DEVICE-KEY` | Raw device secret provisioned alongside the device. The backend hashes this value with SHA-256 before comparing it to the stored hash. |
| `X-GREENBRO-TIMESTAMP` | Client-generated timestamp used for signature freshness checks. Must be within the signature tolerance window from the server clock. Accepts ISO-8601 or Unix epoch milliseconds/seconds. |
| `X-GREENBRO-SIGNATURE` | Lowercase hex HMAC-SHA256 of the string `{timestamp}.{raw JSON payload}` computed with the hashed device key as the signing key. |
| `Content-Type` | Should be `application/json`. Other encodings are rejected when JSON parse fails. |

Signature generation steps:

1. Compute `deviceKeyHash = sha256Hex(rawDeviceKey)`.
2. Serialize the JSON body without extra whitespace.
3. Concatenate `{trimmedTimestamp}.{serializedBody}`.
4. Compute `signature = hmacSha256Hex(deviceKeyHash, concatenatedString)` and send in `X-GREENBRO-SIGNATURE`.

## Payload Schemas

### Telemetry Ingest (`/api/ingest/{profileId}`)

```json
{
  "device_id": "string",
  "ts": "2025-11-03T16:12:00Z",
  "metrics": {
    "supplyC": 46.3,
    "returnC": 42.8,
    "tankC": 51.1,
    "ambientC": 18.2,
    "flowLps": 0.41,
    "compCurrentA": 8.7,
    "eevSteps": 328,
    "powerKW": 2.9,
    "mode": "heating",
    "defrost": 0
  },
  "faults": ["LP01"],
  "rssi": -58
}
```

- `device_id` and `ts` are required non-empty strings.
- `metrics` must be present; all fields are optional but validated as numbers or null. Unknown keys are preserved.
- `faults` defaults to an empty array if omitted.
- `rssi` is optional and coerced to `null` when absent.
- The raw request body must be ≤ 256 KB.

### Heartbeat (`/api/heartbeat/{profileId}`)

```json
{
  "device_id": "string",
  "ts": "2025-11-03T16:12:05Z",
  "rssi": -55
}
```

- `device_id` is required.
- `ts` is optional; if absent the worker fills in the current server time before validation.
- `rssi` is optional and coerced to `null` when absent.

## Timestamp Handling

- Payload timestamps must parse as valid dates and fall within **+5 minutes ahead** and **1 year behind** the server clock. Requests outside this window fail with `400 Timestamp too far in future/too old`.
- Signature freshness uses `X-GREENBRO-TIMESTAMP`. The default tolerance is **±300 seconds** (5 minutes). Set `INGEST_SIGNATURE_TOLERANCE_SECS` to adjust.
- The heartbeat response returns `{ "ok": true, "server_time": "<ISO timestamp>" }` so clients can realign their local clocks.

## Replay Protection

- Each accepted telemetry payload creates an entry in `ingest_nonces` keyed by `(device_id, ts_ms)`.
- Subsequent payloads with the same device/timestamp within the dedupe window return `409 Duplicate payload`.
- The dedupe window defaults to **5 minutes** (`INGEST_DEDUP_WINDOW_MINUTES`) and is enforced against the payload timestamp, not arrival time.

## Rate Limiting

- Telemetry and heartbeat endpoints share a per-device rate counter. The default ceiling is **120 requests per minute** per route (`INGEST_RATE_LIMIT_PER_MIN`).
- When the limit is exceeded the backend returns `429 Rate limit exceeded`.

## Response Codes

| Code | Ingest Scenarios | Heartbeat Scenarios | Recommended Client Action |
| --- | --- | --- | --- |
| `200` | Payload stored successfully; body `{ "ok": true }`. | Heartbeat accepted; payload `{ "ok": true, "server_time": "<ISO>" }`. | No retry. |
| `400` | JSON parse errors, payload validation failures, timestamp outside allowed window. | Same. | Do not retry until payload corrected. |
| `401` | Missing/invalid headers, unknown device, key mismatch, signature outside tolerance. | Same. | Investigate credentials/clock; retry only after correcting root cause. |
| `403` | Origin blocked by CORS policy. | Same. | Fix configuration; no automatic retry. |
| `409` | Profile mismatch, duplicate payload hit dedupe window. | Profile mismatch. | Update profile mapping; skip retries for duplicate responses. |
| `413` | Payload over 256 KB. | N/A. | Reduce payload size. |
| `429` | Per-device rate limit exceeded. | Same. | Retry with exponential backoff after ≥1 minute; honor `INGEST_RATE_LIMIT_PER_MIN`. |
| `500` | Database or worker failure. | Same. | Retry with capped exponential backoff and jitter. Alert if sustained. |

All error responses include an `error` string and, for validation failures, a `details` array enumerating field-level issues.

## Retry & Backoff Guidance

1. **Non-retryable:** `400`, `401`, `403`, `409`, `413`. Treat as configuration, validation, or replay issues that must be fixed client-side before resubmitting.
2. **Retry with delays:** `429` → wait at least 60 seconds (or one full rate-limit window) before retrying. Include jitter to avoid synchronized retries across devices.
3. **Retry with backoff:** `500` → perform up to three retries with exponential backoff starting at 5 seconds and jitter, then surface an alert.

To re-send rejected telemetry after correcting a transient fault, assign a new payload timestamp that reflects the actual measurement time and falls outside the dedupe window, otherwise the request will still collide with the stored nonce.

## Operational Notes

- The backend records per-request metrics in `ops_metrics`. Confirm device counters there when diagnosing rate limits.
- Expired replay nonces are pruned continuously; no client action is required.
- Firmware should monitor `server_time` from heartbeat responses to detect clock drift and ensure the signature timestamp remains within tolerance.

