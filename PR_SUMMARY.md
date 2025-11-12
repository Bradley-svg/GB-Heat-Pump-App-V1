# PR Summary

## What changed
- **Pseudonymized CN gateway error telemetry** – `recordErrorEvent` now HMACs `deviceIdRaw` before persisting so fresh entries in `errors` never contain raw identifiers. Warnings bubble through pino if KMS access fails.
- **Locked raw-ingest escape hatches to localhost** – Extended `services/overseas-api/src/env.ts` to reject `ALLOW_RAW_INGEST` unless both `ENVIRONMENT` and `APP_BASE_URL` are local/test, added Vitest coverage, and updated the shim CI script to block the flag in Wrangler secrets.

## Why
These are the smallest safe fixes that reduce immediate blast radius while the larger P0 backlog (overseas ingest architecture) is addressed. They ensure new CN error rows stay pseudonymous and prevent an operator from accidentally re-enabling raw ingest in production.

## Risk / Migrations
- No schema changes shipped, but historical `errors.device_id_raw` entries still need to be scrubbed manually.
- Overseas env validation now fails fast when `ALLOW_RAW_INGEST` is mis-set, so deployment pipelines must drop that flag outside localhost/test.

## Tests
- `pnpm --filter @greenbro/overseas-api exec vitest run src/__tests__/env.validation.test.ts`
