# PR Summary

## What Changed
- **Locked down overseas batch ingest** by adding `requireAccessJwt`, wiring `ACCESS_JWKS_URL`, and extending the Vitest harness so every call enforces Cloudflare Access before signature checks (`services/overseas-api/src/**/*`).
- **Hardened worker logging**: default `client_ip` redaction is now enabled, and observability error logs mask operator emails plus only emit client ID counts (`src/utils/logging.ts`, `src/routes/observability.ts` + tests).
- **Introduced CI guardrails** with `SCRIPTS/forbidden-fields-lint.js` and `SCRIPTS/pii-regex-scan.js`, giving us a lightweight DROP/PII enforcement step scoped to telemetry-critical directories.

## Tests (manual)
- `node SCRIPTS/forbidden-fields-lint.js`
- `node SCRIPTS/pii-regex-scan.js`

## Follow-Ups
1. Run `corepack pnpm install --filter @greenbro/overseas-api --lockfile-only` (or equivalent) so `pnpm-lock.yaml` reflects the new `jose` dependency.
2. Replace the corrupted Mandarin privacy notice text and add a lint to prevent encoding regressions.
3. Author & commit the Missing Important-Data handling checklist noted in the audit.
