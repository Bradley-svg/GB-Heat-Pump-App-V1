| Guard | Status | Notes / Evidence |
| --- | --- | --- |
| CN gateway DROP/SAFE enforcement | Pass | `services/cn-gateway/src/modea/sanitize.ts` rejects DROP fields and `services/cn-gateway/src/ingest/routes.ts` forwards only the shared `SAFE_METRICS` payload. |
| Pseudonymization via CN KMS (HMAC-SHA256, 22-char truncation) | Pass | `services/cn-gateway/src/crypto/pseudo.ts` calls CN KMS adapters and truncates to 22 chars; mapping data never leaves CN Postgres. |
| Mapping table & re-ID dual control | Pass | Dual-control SOP (`../../dual-control-sop.md`) and `services/cn-gateway/src/db/audit.ts` enforce two-person approvals plus auditable comments for each lookup. |
| Export signing + overseas verification | Pass (requires secret) | The exporter signs every batch (`services/cn-gateway/src/crypto/ed25519.ts`); the Worker verifies `x-batch-signature` before persisting (`services/overseas-api/src/utils/ed25519.ts`, `services/overseas-api/src/routes/ingest.ts`). Non-local deploys must set `EXPORT_VERIFY_PUBKEY` (`services/overseas-api/src/env.ts`). |
| Replay protection (seq ring + +/-120s skew) | Pass | `services/cn-gateway/src/db/replay.ts` enforces the seq ring and timestamp skew window so replays outside +/-120s are dropped. |
| DROP enforcement on overseas ingest/logs | Pass | `/api/ingest` returns `410 raw_ingest_disabled` without signatures and never logs device IDs (`services/overseas-api/src/routes/ingest.ts`, `services/overseas-api/src/lib/ops-metrics.ts`). |
| Forbidden-field / PII scanners | Pass | `modea-guards.yml` and `.github/workflows/full-ci.yml` both run `scripts/forbidden-fields-lint.js` + `scripts/pii-regex-scan.js`, covering apps/services/docs. |
| Privacy notices (bilingual, accurate) | Pass | `../../privacy-notice/operator-mode-a.md` contains synchronized English + Mandarin text describing pseudonymous processing. |
| Important-Data checklist | Pass | `../../important-data-checklist.md` documents mapping DB, KMS keys, Ed25519 pubkey, and client-event hashing with owners + verification steps. |
| CI enforcement for guards | Pass | Mode A guard workflow and `full-ci` fail on P0/P1 findings and upload SARIF for triage transparency. |
