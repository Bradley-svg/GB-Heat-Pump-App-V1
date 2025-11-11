| Guard | Status | Notes / Evidence |
| --- | --- | --- |
| CN gateway DROP/SAFE enforcement | Pass | `services/cn-gateway/src/modea/drop-safe.ts` + `sanitizeTelemetry` continue to reject DROP keys and emit only the SAFE metrics list. |
| Pseudonymization via CN KMS (HMAC-SHA256, 22-char truncation) | Pass | `services/cn-gateway/src/crypto/pseudo.ts` uses CN-resident KMS adapters and deterministic truncation; mapping table stays inside CN Postgres. |
| Mapping table & re-ID dual control | Pass | Dual-control SOP documented in `../../dual-control-sop.md`; two-person sign-off required for mapping queries. |
| Export signing + overseas verification | Pass (requires secret) | CN exporter signs batches; overseas Worker now requires `didPseudo`, enforces signatures, and `/health` reports `signatureConfigured`. Operators must keep `EXPORT_VERIFY_PUBKEY` populated via Wrangler secrets. |
| Replay protection (seq ring + ±120s skew) | Pass | `services/cn-gateway/src/db/replay.ts` enforces the seq ring buffer and skew from `TIMESTAMP_SKEW_SECS`. |
| DROP enforcement on overseas ingest/logs | Pass | `/api/ingest` is disabled by default (`410 raw_ingest_disabled`) and nested log fields no longer contain `client_ip`. |
| Forbidden-field / PII scanners | Pass | `modea-guards.yml` plus the `full-ci` workflow run `node SCRIPTS/forbidden-fields-lint.js` and `node SCRIPTS/pii-regex-scan.js` on every PR. |
| Privacy notices (bilingual, accurate) | Pass | `../../privacy-notice/operator-mode-a.md` now contains UTF-8 Mandarin copy aligned with the enforced architecture. |
| Important-Data checklist | Pass | `../../important-data-checklist.md` documents mapping DB, KMS keys, Ed25519 pubkey, and client-event hashing with owners + verification steps. |
| CI enforcement for guards | Pass | Both Mode A guard workflow and `full-ci` run the scanners and fail the build on P0/P1 findings. |
