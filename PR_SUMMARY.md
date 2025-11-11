# PR Summary

## What Changed
- Masked client error reporting logs via `sanitizeReporterUser`, preventing reporter emails/roles from leaving CN (`src/routes/observability.ts`, tests in `src/routes/__tests__/observability.test.ts`).
- Pseudonymized `client_events.user_email` by hashing with `CLIENT_EVENT_TOKEN_SECRET`, plus unit tests covering deterministic output (`src/lib/client-events.ts`, `src/lib/__tests__/client-events.test.ts`).
- Documented audit results across SBOM/Risk/ModeA checklists + refreshed findings artifacts.

## Tests
- `npx vitest run src/routes/__tests__/observability.test.ts src/lib/__tests__/client-events.test.ts`

## Follow-Ups
1. Remove the raw `/api/ingest` code path and require pseudonymized batches end-to-end (see P0).
2. Harden Cloudflare Access verification (issuer + clock tolerance) and align exporter vs overseas schemas before enabling signature-only ingest.
3. Backfill hashed values for existing `client_events.user_email` rows and deploy the Worker so the new masking takes effect.
