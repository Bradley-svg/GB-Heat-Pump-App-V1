# Mode A Guards Checklist
| Control | Status | Evidence / Notes |
| --- | --- | --- |
| DROP/SAFE enforced at CN ingress | Pass | `services/cn-gateway/src/modea/sanitize.ts` scans `DROP_FIELDS` and copies only `SAFE_METRICS`. |
| Export path rejects non-SAFE metrics | Fail | Overseas worker still uses legacy `TelemetryMetricsSchema` (Finding P1-safe-metrics-not-enforced). |
| No raw IDs/IPs leave CN | Fail | Worker logs + D1 store `device_id` (`src/routes/ingest.ts`, `migrations/0001_init.sql`). nginx IP logging fixed but data plane still exposes IDs. |
| Pseudonymization (HMAC-SHA256) & dual control documented | Pass | `services/cn-gateway/src/crypto/pseudo.ts`, `docs/dual-control-sop.md`. |
| Batch exports signed & verified | Pass | `services/cn-gateway/src/crypto/ed25519.ts` + `services/overseas-api/src/index.ts` (but data still dropped). |
| Replay protection & seq windows enforced | Pass | `services/cn-gateway/src/db/replay.ts` enforces +/-120s + seq ring.
| CI Mode A guards (forbidden fields, PII regex) | Partial | Workflows run but scripts ignore docs/markdown (Finding P2-guard-ignores-docs). |
| Bilingual privacy notice accurate | Pass | `docs/privacy-notice/operator-mode-a.md` contains English + Mandarin text referencing pseudonymous processing.
