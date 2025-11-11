# PR Summary

## What Changed
- **Sunsetted raw `/api/ingest`** so overseas Worker now returns `410 raw_ingest_disabled` unless `ALLOW_RAW_INGEST` is explicitly set; CN gateway exporter/REST responses now speak `didPseudo` end-to-end and the overseas Worker requires a secret-backed `EXPORT_VERIFY_PUBKEY` (with `/health` surfacing `signatureConfigured`).
- **Hardened auth/logging/privacy:** `requireAccessUser` now enforces issuer + 60s clock tolerance, rate-limit logs no longer include nested `client_ip`, a nightly `CLIENT_EVENT_BACKFILL_CRON` job keeps historical client events hashed, and the telemetry schema now uses `.strict()` so unexpected metrics raise 400s instead of being dropped silently.
- **Guardrails + docs:** Mode A scanners run via the dedicated workflow and `full-ci`, the Important-Data checklist links to a new dual-control SOP plus the Ed25519 rotation runbook, and the Mode A guidance reflects the disabled raw ingest + SAFE metric reality.

## Tests
- `npx vitest run src/routes/__tests__/ingest.test.ts src/lib/__tests__/client-events.test.ts src/routes/__tests__/observability.test.ts src/lib/__tests__/access.test.ts src/routes/__tests__/client-events-admin.test.ts`
- `npx vitest run src/jobs/__tests__/client-events-backfill.test.ts src/__tests__/app.scheduled.test.ts`
- `npx vitest run services/overseas-api/src/index.test.ts`

## Follow-Ups
1. Instrument `.strict()` validation fallout (dashboards + firmware owner alerts) so we react quickly to any uptick in 400s.
2. Add CI smoke tests for the Node-RED flow + MODBUS mapper to guard against accidental schema drift.
3. Automate Ed25519 rotation evidence capture (store `/health` output + ticket IDs) and schedule quarterly audits of the dual-control SOP execution trail.
