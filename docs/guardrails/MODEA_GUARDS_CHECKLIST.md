# Mode A Guards Checklist
| Control | Status | Evidence / Notes |
| --- | --- | --- |
| DROP/SAFE enforced at CN ingress | Pass | `services/cn-gateway/src/modea/sanitize.ts` drops forbidden keys and the ingest route (`services/cn-gateway/src/ingest/routes.ts`) forwards only `SAFE_METRICS`. |
| Export path rejects non-SAFE metrics | Pass | `services/overseas-api/src/schemas/export.ts` validates each record before persistence and the shared SAFE list lives in `packages/sdk-core/src/constants.ts`. |
| No raw IDs/IPs leave CN | Pass | Overseas ingest logs/metrics set `deviceId = null` and D1 stores only `didPseudo` (`services/overseas-api/src/routes/ingest.ts`, `services/overseas-api/src/lib/ops-metrics.ts`, `services/overseas-api/migrations/0022_purge_raw_device_ids.sql`). |
| Pseudonymization (HMAC-SHA256) & dual control documented | Pass | `services/cn-gateway/src/crypto/pseudo.ts` plus `docs/dual-control-sop.md` cover deterministic HMAC + two-person approvals; `services/cn-gateway/src/db/audit.ts` records access. |
| Batch exports signed & verified | Pass | CN exporter signs via `services/cn-gateway/src/crypto/ed25519.ts`; overseas Worker verifies `x-batch-signature` (`services/overseas-api/src/utils/ed25519.ts`, `services/overseas-api/src/routes/ingest.ts`). Env validation requires `EXPORT_VERIFY_PUBKEY` outside local (`services/overseas-api/src/env.ts`). |
| Replay protection & seq windows enforced | Pass | `services/cn-gateway/src/db/replay.ts` enforces the sequence ring buffer and +/-120s skew. |
| CI Mode A guards (forbidden fields, PII regex) | Pass | `.github/workflows/modea-guards.yml` and `full-ci.yml` run `scripts/forbidden-fields-lint.js` and `scripts/pii-regex-scan.js` across apps/services/docs. |
| Bilingual privacy notice accurate | Pass | `docs/privacy-notice/operator-mode-a.md` provides matched English + Mandarin copy referencing SAFE processing. |
