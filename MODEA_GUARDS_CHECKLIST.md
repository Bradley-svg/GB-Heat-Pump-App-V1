| Guard | Status | Notes / Evidence |
| --- | --- | --- |
| CN gateway DROP/SAFE enforcement | ✅ | `services/cn-gateway/src/modea/drop-safe.ts` + `sanitizeTelemetry` still reject DROP keys and emit only the SAFE metrics list. |
| Pseudonymization via CN KMS (HMAC-SHA256, 22-char truncation) | ✅ | `services/cn-gateway/src/crypto/pseudo.ts` uses provider adapters + deterministic truncation; mapping table stays in CN Postgres. |
| Mapping table & re-ID dual control | ⚠️ Needs SOP | Code keeps mapping in CN, but no dual-control / Important-Data checklist is versioned. |
| Export signing + overseas verification | ⚠️ Blocked | CN signs batches, but overseas API rejects `pseudoId` (expects `didPseudo`) and lacks a configured `EXPORT_VERIFY_PUBKEY`, so verification is effectively disabled. |
| Replay protection (seq ring + ±120s skew) | ✅ | `services/cn-gateway/src/db/replay.ts` enforces 5-entry ring + configurable skew via `TIMESTAMP_SKEW_SECS`. |
| DROP enforcement on overseas ingest/logs | ❌ | Worker `/api/ingest` still accepts raw `device_id` + non-SAFE metrics (`src/routes/ingest.ts`), and nested log fields leak `client_ip`. |
| Forbidden-field / PII scanners | ⚠️ Tool-only | Scripts live under `.github/scripts/*`, but there is no pre-commit/CI wiring yet. |
| Privacy notices (bilingual, accurate) | ⚠️ Doc drift | Operator notice promises pseudonymized exports, which is currently false; Mandarin text should be re-validated. |
| Important-Data checklist | ❌ | No document tracks custody/rotation for mapping DB, KMS keys, or Access secrets. |
| CI enforcement for guards | ⚠️ | Needs workflow updates to run the Mode A scanners + schema parity tests on every PR. |
