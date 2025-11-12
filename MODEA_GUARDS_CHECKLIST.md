# Mode A Guards Checklist (2025‑11 audit)

| Control | Status | Evidence / Notes |
| --- | --- | --- |
| DROP/SAFE enforced at CN ingress | ✅ Pass | `services/cn-gateway/src/modea/sanitize.ts` enforces `DROP_FIELDS` recursively and only copies keys from `SAFE_METRICS`. Schema (`services/cn-gateway/src/validators/telemetry.schema.json`) sets `additionalProperties:false`. |
| Export path rejects non-SAFE metrics | ❌ Fail | Overseas worker still accepts legacy `TelemetryPayloadSchema` (`services/overseas-api/src/schemas/ingest.ts`) and never references `SAFE_METRICS`. Needs new batch endpoint. |
| No raw IDs/IPs leave CN | ❌ Fail | `services/overseas-api/src/routes/ingest.ts:247-367` logs raw `device_id`; `services/overseas-api/src/lib/ops-metrics.ts:31` writes raw IDs into D1. CN gateway `errors` insertion was fixed in this PR but overseas remains unpseudonymized. |
| Pseudonymization (HMAC-SHA256) & dual control | ⚠️ Partial | Code (`services/cn-gateway/src/crypto/pseudo.ts`) truncates HMAC correctly; dual-control SOP exists (`docs/dual-control-sop.md`). Need automated evidence collection for dual approvals. |
| Batch exports signed & verified | ❌ Fail | CN gateway signs batches (`services/cn-gateway/src/crypto/ed25519.ts`), but the overseas worker neither loads `EXPORT_VERIFY_PUBKEY` nor checks `x-batch-signature`. `/health` (`services/overseas-api/src/routes/health.ts`) does not expose signature state. |
| Replay protection (seq + ±120s) | ✅ Pass | `services/cn-gateway/src/db/replay.ts` enforces a five-slot sequence ring and ±`config.TIMESTAMP_SKEW_SECS` (default 120s). |
| CI Mode A guards (forbidden fields & regex) | ⚠️ Partial | Scripts exist (`scripts/forbidden-fields-lint.js`, `scripts/pii-regex-scan.js`) but currently exclude docs/tests and are red due to fixtures embedding `email`. Need coverage expansion + allowlist cleanup. |
| Raw ingest shim disabled outside CN | ⚠️ Partial | `ALLOW_DEV_ACCESS_SHIM` is properly gated, but `ALLOW_RAW_INGEST` just gained gating in this PR and still needs permanent removal plus monitoring. |
| Bilingual privacy notice accurate | ✅ Pass | `docs/privacy-notice/operator-mode-a.md` provides English + Simplified Chinese copy referencing pseudonymous processing and CN hotline. |
