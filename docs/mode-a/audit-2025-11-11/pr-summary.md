# PR Summary

## What Changed
- **Signed SAFE batches only:** The CN gateway exporter (`services/cn-gateway/src/ingest/routes.ts`, `src/modea/sanitize.ts`, `src/crypto/ed25519.ts`) emits pseudonymous `didPseudo` batches and signs them with Ed25519. The overseas Worker (`services/overseas-api/src/routes/ingest.ts`, `src/utils/ed25519.ts`) rejects any request lacking `x-batch-signature`, verifies the signature before parsing, and `validateEnv` (`src/env.ts`) now hard-fails non-local deploys that omit `EXPORT_VERIFY_PUBKEY`.
- **Hardened auth/logging/privacy:** `requireAccessUser` enforces issuer + 60 s clock tolerance, rate-limit logs no longer include nested `client_ip`, the nightly `CLIENT_EVENT_BACKFILL_CRON` job keeps historical client events hashed, and the telemetry schema uses `.strict()` so unexpected metrics raise 400s instead of being dropped silently.
- **Guardrails + docs:** Mode A scanners run via the dedicated workflow and `full-ci`, the Important-Data checklist links to the dual-control SOP plus the Ed25519 rotation runbook, and Mode A guidance now cites the new SAFE ingest/signature evidence.

## Tests
- `npx vitest run src/routes/__tests__/ingest.test.ts src/lib/__tests__/client-events.test.ts src/routes/__tests__/observability.test.ts src/lib/__tests__/access.test.ts src/routes/__tests__/client-events-admin.test.ts`
- `npx vitest run src/jobs/__tests__/client-events-backfill.test.ts src/__tests__/app.scheduled.test.ts`
- `npx vitest run services/overseas-api/src/index.test.ts`

## Follow-Ups
1. Instrument `.strict()` validation fallout (dashboards + firmware owner alerts) so we react quickly to any uptick in 400s.
2. Add CI smoke tests for the Node-RED flow + MODBUS mapper to guard against accidental schema drift.
3. Automate Ed25519 rotation evidence capture (store `/health` output + ticket IDs) and schedule quarterly audits of the dual-control SOP execution trail.
