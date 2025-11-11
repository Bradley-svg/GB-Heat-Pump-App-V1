# PR Summary

## What Changed
- **Sunsetted raw `/api/ingest`** so overseas Worker now returns `410 raw_ingest_disabled` unless `ALLOW_RAW_INGEST` is explicitly set; CN gateway exporter/REST responses now speak `didPseudo` end-to-end and the overseas Worker requires a secret-backed `EXPORT_VERIFY_PUBKEY` (with `/health` surfacing `signatureConfigured`).
- **Hardened auth/logging/privacy:** `requireAccessUser` now enforces issuer + 60s clock tolerance, rate-limit logs no longer include nested `client_ip`, and a new admin endpoint (`POST /api/admin/client-events/backfill`) re-hashes legacy `client_events.user_email` rows so the Worker + DB remain aligned.
- **Guardrails + docs:** Mode A scanners run via the dedicated workflow and `full-ci`, the Important-Data checklist covers Ed25519 + client-event controls, and the Mode A guidance reflects the disabled raw ingest + SAFE metric reality.

## Tests
- `npx vitest run src/routes/__tests__/ingest.test.ts src/lib/__tests__/client-events.test.ts src/routes/__tests__/observability.test.ts src/lib/__tests__/access.test.ts src/routes/__tests__/client-events-admin.test.ts`
- `npx vitest run services/overseas-api/src/index.test.ts`

## Follow-Ups
1. Formalize and publish the dual-control SOP for mapping table access (still marked as a gap in the Mode A guard checklist).
2. Enforce `.strict()` telemetry validation (replace `.strip()` to reject unknown metrics) so DROP regressions cannot slip through silently.
3. Schedule the client-event email backfill (new admin endpoint) as part of the next Worker deploy and verify D1 rows are fully hashed.
