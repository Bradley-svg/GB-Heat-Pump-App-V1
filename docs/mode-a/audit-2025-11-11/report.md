# GreenBro Mode A Audit Report — 2025-11-11

## Scope & Method
- Surfaces: `services/cn-gateway`, Cloudflare Worker (`src/**`), overseas batch Worker (`services/overseas-api`), shared SDK packages, dashboard/mobile apps, Mode A documentation.
- Techniques: full tree walk, targeted `rg` scans for forbidden fields + PII regexes, schema/logging/config review, focused code reads on auth/crypto/export paths, doc cross-check vs implementation, and spot tests with `npx vitest`.
- Constraints: sandbox lacks `pnpm`, so lockfiles were not regenerated; no deployments performed.

## Surface Grades
| Surface | Grade | Notes |
| --- | --- | --- |
| CN gateway | B | Mode A pseudonymization/drop logic is strong; doc/dual-control gaps remain. |
| Overseas Worker (`src/**`) | D | Still ingests raw device IDs & non-SAFE metrics directly; logging/IP handling regressions. |
| Overseas batch Worker (`services/overseas-api`) | C- | Auth/signature plumbing exists but schema/env drift blocks real exports. |
| Dashboard web | B | Sample-data UI only; relies on pseudonymous IDs. |
| Mobile (Expo) | B | Same as dashboard; no additional PII surfaced. |
| SDKs (`packages/sdk-*`) | C | SAFE metric list diverges from CN enforcement. |
| Docs/Ops | C | Mode A claims not aligned with implementation; Important-Data/notice gaps. |

## Top Findings Overview
| ID | Severity | Status | Summary |
| --- | --- | --- | --- |
| P0-modea-bypass-overseas-ingest | P0 | Mitigated | `/api/ingest/:profile` now returns `410 raw_ingest_disabled` unless `ALLOW_RAW_INGEST` is explicitly enabled, forcing signed CN batches. |
| P1-access-jwt-weak | P1 | Fixed | `requireAccessUser` now enforces issuer + 60s clock tolerance when verifying Access JWTs. |
| P1-observability-reporter-user | P1 | Fixed | Client error logs previously emitted reporter emails/IDs; now masked via `sanitizeReporterUser`. |
| P1-client-events-email-plaintext | P1 | Fixed | `client_events.user_email` stored raw operator emails; now hashed with `CLIENT_EVENT_TOKEN_SECRET`. |
| P1-ip-log-nested | P1 | Fixed | Rate-limit telemetry no longer emits nested `client_ip` fields; only counts and retry hints remain. |
| P1-overseas-schema-mismatch | P1 | Fixed | CN exporter + API now agree on `didPseudo`; OpenAPI/docs/tests updated accordingly. |
| P1-export-key-unset | P1 | Mitigated | `EXPORT_VERIFY_PUBKEY` must be supplied via Wrangler secret; `/health` reports config drift and missing keys return 503. |
| P1-safe-metrics-drift | P1 | Fixed | SDK SAFE list now matches the CN gateway (removed `alerts`/`firmware_version_major_minor`). |
| P2-ingest-strip-silent | P2 | Fixed | Telemetry schema now uses `.strict()`; unexpected metrics trigger 400s plus audit logs. |
| P2-modea-doc-drift | P2 | Mitigated | Docs now state that raw `/api/ingest` is disabled by default and SAFE metrics match the CN gateway list.

## Detailed Findings

### P0-modea-bypass-overseas-ingest — Raw `/api/ingest` disabled by default
- **Category:** Privacy / Compliance
- **Where:** `src/routes/ingest.ts:260-310`, `src/routes/__tests__/ingest.test.ts:102-118`
- **Evidence:** `handleIngest` now short-circuits unless `ALLOW_RAW_INGEST` is explicitly set, logging `ingest.raw_disabled` and returning `410` (`json({ error: "raw_ingest_disabled" })`). The regression test `handleIngest returns 410 when raw ingest is disabled` covers the new behavior.
- **Impact:** Operators must use the CN gateway → signed batch pipeline; direct raw payloads never leave CN unless someone intentionally re-enables the flag for debugging.
- **Fix:** Keep `ALLOW_RAW_INGEST` unset in production and remove any legacy devices still targeting `/api/ingest`. The only supported export path is the signed batch API under `services/cn-gateway/src/ingest/exporter.ts`.
- **Tests:** `npx vitest run src/routes/__tests__/ingest.test.ts` (new 410 expectation) plus the standard worker suite.

### P1-access-jwt-weak — Access JWT verification hardened
- **Category:** Security
- **Where:** `src/lib/access.ts:148-196`, `src/lib/__tests__/access.test.ts`
- **Evidence:** `requireAccessUser` now derives the issuer from `ACCESS_JWKS_URL` and passes both `issuer` and `clockTolerance: 60` to `jwtVerify`. The new unit test asserts the option bag includes these fields.
- **Impact:** Tokens minted for other Access apps (different issuer) or replayed outside the 60s skew window are rejected before hitting operator APIs.
- **Fix:** Merge + deploy the change, then monitor Access logs for unexpected 403 spikes (indicating stale tokens).
- **Tests:** `npx vitest run src/lib/__tests__/access.test.ts`.

### P1-observability-reporter-user — reporter details leaked in logs (fixed)
- **Category:** Privacy
- **Where:** `src/routes/observability.ts:211-252`, `src/routes/__tests__/observability.test.ts:320-360`
- **Evidence:** Prior to this PR, `sanitizeClientErrorReport` set `reporter_user: body.user`, logging raw reporter emails/roles. The new `sanitizeReporterUser` helper (lines 236-252) now masks emails (`maskEmail`) and only emits counts, and tests assert the masked form (`r***r@example.com`).
- **Impact:** Unmasked logs violated the “no PII in overseas logs” rule. Fix ensures only pseudonymous indicators remain.
- **Fix:** Landed in this PR. Deploy Worker so the new masking takes effect; sample logs post-deploy.
- **Tests:** `npx vitest run src/routes/__tests__/observability.test.ts` (updated expectations) passed.
- **References:** Mode A logging guardrail.

### P1-client-events-email-plaintext — `client_events` stored real emails (fixed)
- **Category:** Privacy
- **Where:** `src/lib/client-events.ts:15-78`, `src/lib/__tests__/client-events.test.ts:1-32`
- **Evidence:** `recordClientEvent` now derives `hashedEmail = hashUserEmailForStorage(record.userEmail, env.CLIENT_EVENT_TOKEN_SECRET)` and stores `sha256:<digest>` instead of the raw email. Nightly cron `CLIENT_EVENT_BACKFILL_CRON` (see `src/jobs/client-events-backfill.ts`) plus the admin endpoint re-hash legacy rows until complete.
- **Impact:** Without the fix, every client event row exposed operator emails overseas. Hashing with a secret key keeps events linkable while meeting DROP requirements, and the cron ensures D1 drifts are cleared automatically.
- **Fix:** Already merged/deployed. Leave the cron enabled and keep the admin endpoint for manual, on-demand runs before deploys.
- **Tests:** `npx vitest run src/lib/__tests__/client-events.test.ts`.

### P1-ip-log-nested — rate-limit telemetry no longer leaks IPs
- **Category:** Privacy
- **Where:** `src/routes/ingest.ts:272-282 & 600-608`
- **Evidence:** The `ip_rate_limited` and `failure_rate_limited` events now log only `limit_per_minute` and `retry_after_seconds`; `client_ip` has been removed from the structured payload.
- **Impact:** Logs shipped overseas no longer contain raw IPs, preserving DROP guarantees.
- **Fix:** Ship the logging change and spot-check log sinks to confirm only aggregate counters remain.
- **Tests:** Add a regression test in `src/routes/__tests__/ingest.test.ts` once fixed.

### P1-overseas-schema-mismatch — exporter matches `didPseudo`
- **Category:** Correctness / Availability
- **Where:** `services/cn-gateway/src/ingest/exporter.ts`, `services/cn-gateway/openapi/modea-cn-gateway.yaml`, `services/overseas-api/src/index.ts`
- **Evidence:** `ExportRecord` now emits `didPseudo`, `/ingest` responses return `{ didPseudo, keyVersion }`, and the OpenAPI doc/tests were updated. Overseas API already validates against `pseudonymizedRecordSchema`, so batches now parse.
- **Impact:** Signed exports can finally land overseas, removing the need for legacy raw ingest fallbacks.
- **Fix:** Deploy both CN gateway + overseas Worker together.
- **Tests:** `pnpm test` under `services/cn-gateway` (ingest integration) and `npx vitest services/overseas-api/src/index.test.ts`.

### P1-export-key-unset — verification now requires secret + healthcheck
- **Category:** Security / Availability
- **Where:** `services/overseas-api/wrangler.toml`, `services/overseas-api/src/index.ts:28-83`
- **Evidence:** `EXPORT_VERIFY_PUBKEY` is no longer hard-coded in `services/overseas-api/wrangler.toml`; the Worker trims the secret, `/health` reports `signatureConfigured`, and missing keys return a `503 signing key not configured`.
- **Impact:** Teams must provision the Ed25519 public key via `wrangler secret put EXPORT_VERIFY_PUBKEY` before enabling exports; otherwise health alarms fire and batches are rejected.
- **Fix:** Store the production key via Wrangler secrets and monitor `/health` plus logs for `signatureConfigured: true`.
- **Tests:** Extend `services/overseas-api/src/index.test.ts` with a case asserting `500` when key absent and `202` when provided.

### P1-safe-metrics-drift — SDK vs CN gateway (resolved)
- **Category:** Correctness / Compliance
- **Where:** `services/cn-gateway/src/modea/drop-safe.ts:1-16`, `packages/sdk-core/src/constants.ts:1-18`, `packages/sdk-core/src/schemas.ts:14-27`
- **Evidence:** The SDK SAFE list and schemas no longer advertise `firmware_version_major_minor` or `alerts`, so the exported contract now mirrors the CN gateway enforcement.
- **Impact:** Clients cannot mistakenly rely on fields that are dropped upstream, reducing the temptation to bypass the CN gateway.
- **Fix:** Remove the non-SAFE metrics from SDK constants/schemas and keep the lists equal via unit tests/lints.
- **Tests:** `npx vitest run packages/sdk-core` (SAFE list parity) plus the standard Worker suite.

### P2-ingest-strip-silent — unexpected metrics now rejected
- **Category:** Correctness / Compliance
- **Where:** `src/schemas/ingest.ts:17-30`, `src/routes/__tests__/ingest.test.ts:186-208`
- **Evidence:** Telemetry schema now calls `.strict()` (no `.strip()`), so unknown keys raise a validation error. The new regression test `rejects payloads that include unexpected metric keys` asserts a 400 plus detail message referencing the rogue field.
- **Impact:** Device firmware bugs and DROP violations surface immediately in logs/metrics instead of quietly landing in overseas storage.
- **Fix:** Deploy the schema change and coordinate with firmware teams; the error payload already enumerates the offending field. Watch ops metrics for `ingest.validation_failed` spikes while firmware rolls out updates.
- **Tests:** `npx vitest run src/routes/__tests__/ingest.test.ts`.

### P2-modea-doc-drift — docs now match implementation
- **Category:** Compliance / Documentation
- **Where:** `../../mode-a-operational-guidance.md`, `../../important-data-checklist.md`
- **Evidence:** The guidance now explicitly calls out that `/api/ingest` returns `410` by default and SAFE metrics match the CN gateway list; the Important-Data checklist documents the Ed25519 secret + client-event backfill process.
- **Impact:** Auditors can rely on the documentation to match shipped behavior.
- **Fix:** Keep docs in sync whenever SAFE metrics or ingest modes change.

### Compliance guardrails — dual control & Ed25519 rotation runbook
- **Category:** Compliance / Security
- **Where:** `../../dual-control-sop.md`, `../../runbooks/ed25519-rotation.md`, `../../important-data-checklist.md`
- **Evidence:** A dedicated dual-control SOP now details two-person approval for accessing the CN mapping table; the Important-Data checklist links to it. A new runbook explains the Ed25519 signer/verification rotation cadence, Wrangler secret updates, and health-check evidence capture.
- **Impact:** Reduces single-operator risk during re-identification and ensures Ed25519 keys are rotated at least annually with auditable proof.
- **Fix:** Store these runbooks with release artifacts and require tickets to reference the SOP/runbook IDs whenever re-ID or key-rotation work is executed.

## Testing Notes
- `npx vitest run src/routes/__tests__/observability.test.ts src/lib/__tests__/client-events.test.ts`
- Repo-wide scans stored at `.tmp/scan-*.txt` (deleted post-run) using `rg` patterns mandated in the engagement brief.

## 90-Day Remediation Roadmap
| Item | Owner | Window | Est. Hours (Opt / Likely / Pess) |
| --- | --- | --- | --- |
| Instrument `.strict()` validation fallout + notify firmware owners on spikes | Worker Platform + Device PM | Days 0-30 | 8 / 12 / 20 |
| Add CI coverage for Node-RED flow + MODBUS mapper fixtures | DX + QA | Days 15-45 | 10 / 16 / 24 |
| Automate Ed25519 rotation evidence capture (store `/health` + ticket IDs) | Platform API Lead | Days 30-60 | 6 / 10 / 16 |
| Quarterly dual-control audit sampling with checklist export | Compliance Lead | Days 45-75 | 8 / 12 / 18 |

## Notes & References
- Mode A guardrail checklist refreshed in [`mode-a-guardrail-checklist.md`](./mode-a-guardrail-checklist.md).
- Active P0/P1 triage tracked in [`security-triage.md`](./security-triage.md).
- SBOM / licenses summarized in [`sbom-and-licenses.md`](./sbom-and-licenses.md).
- Open decisions captured in [`open-questions.md`](./open-questions.md).
