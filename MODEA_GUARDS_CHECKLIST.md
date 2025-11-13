# Mode A Guards Checklist (2025-11 audit)

| Control | Status | Evidence / Notes |
| --- | --- | --- |
| DROP/SAFE enforced at CN ingress | Pass | `services/cn-gateway/src/modea/sanitize.ts` enforces `DROP_FIELDS` recursively and the telemetry schema keeps `additionalProperties:false`. |
| Export path rejects non-SAFE metrics | Pass | `services/overseas-api/src/schemas/export.ts` + `routes/ingest.ts` only accept SAFE metrics and discard unknown keys before writing to D1. |
| No raw IDs/IPs leave CN | Pass | Batch ingest stores only `didPseudo`, D1 was purged via `migrations/0022_purge_raw_device_ids.sql`, and ingest logging drops device identifiers entirely. |
| Pseudonymization (HMAC-SHA256) & dual control | Partial | CN gateway still handles pseudonymization via KMS and the dual-control SOP exists, but evidence collection is manual. |
| Batch exports signed & verified | Pass | `services/overseas-api/src/utils/ed25519.ts` verifies `x-batch-signature` using the Wrangler-supplied public key before any data is parsed. |
| Replay protection (seq + ±120s) | Pass | `services/cn-gateway/src/db/replay.ts` enforces a five-slot sequence ring plus `TIMESTAMP_SKEW_SECS`. |
| CI Mode A guards (forbidden fields, PII regex) | Pass | Guard scripts now scan apps/services/docs/ops (see `scripts/forbidden-fields-lint.js`, `scripts/pii-regex-scan.js`), and continue to run in pre-commit/CI. |
| Raw ingest shim disabled outside CN | Pass | Env validation + the shim CI gate reject `ALLOW_RAW_INGEST` whenever `APP_BASE_URL` isn’t localhost. |
| Bilingual privacy notice accurate | Pass | `docs/privacy-notice/operator-mode-a.md` still provides English + Simplified Chinese copy referencing pseudonymous processing and the CN hotline. |
