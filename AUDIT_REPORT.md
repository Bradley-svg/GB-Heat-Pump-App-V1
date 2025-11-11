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
| P0-modea-bypass-overseas-ingest | P0 | Open | Cloudflare Worker still accepts/stores raw `device_id` + unsanitized metrics; violates Mode A DROP/Safe. |
| P1-access-jwt-weak | P1 | Open | Access JWT verification omits issuer + clock tolerance; audience-only check is bypassable. |
| P1-observability-reporter-user | P1 | Fixed | Client error logs previously emitted reporter emails/IDs; now masked via `sanitizeReporterUser`. |
| P1-client-events-email-plaintext | P1 | Fixed | `client_events.user_email` stored raw operator emails; now hashed with `CLIENT_EVENT_TOKEN_SECRET`. |
| P1-ip-log-nested | P1 | Open | Rate-limit logs embed raw `client_ip` inside structured fields, bypassing redaction. |
| P1-overseas-schema-mismatch | P1 | Open | CN exporter sends `pseudoId`, while overseas API insists on `didPseudo`; batches fail validation. |
| P1-export-key-unset | P1 | Open | `EXPORT_VERIFY_PUBKEY` left empty in `wrangler.toml`, so signature verification returns 500. |
| P1-safe-metrics-drift | P1 | Open | SDK advertises `alerts`/`firmware_version` as SAFE but CN gateway drops them; schema drift. |
| P2-ingest-strip-silent | P2 | Open | `.strip()` on Telemetry schema silently discards unexpected keys instead of rejecting. |
| P2-modea-doc-drift | P2 | Open | Mode A docs promise pseudonymized-only exports, contradicting current Worker behavior.

## Detailed Findings

### P0-modea-bypass-overseas-ingest — Worker stores raw device IDs/metrics overseas
- **Category:** Privacy / Compliance
- **Where:** `src/routes/ingest.ts:260-565`, `src/schemas/ingest.ts:17-39`, `migrations/0001_init.sql:1-34`
- **Evidence:** The Worker accepts payloads with `device_id`, `tankC`, `ambientC`, etc. (`src/schemas/ingest.ts:17-30`), validates them, and inserts the raw JSON into `telemetry` / `latest_state` tables (`src/routes/ingest.ts:486-550`). `migrations/0001_init.sql` defines those tables keyed by `device_id`, meaning raw identifiers/metrics are persisted outside China.
- **Impact:** Direct ingestion bypasses the CN pseudonymization gateway, exporting PII and non-SAFE metrics overseas, violating Mode A residency commitments and potentially triggering PIPL filings.
- **Fix:** Disable `/api/ingest/:profile` for raw payloads and require signed batches containing `did_pseudo` + SAFE metrics only, mirroring the CN exporter contract. Migrate D1 schemas to store pseudonymous keys and purge historical raw IDs. Add regression tests that reject any payload containing DROP keys or non-SAFE metrics.
- **Tests:** Add integration tests under `tests/integration/worker.integration.test.ts` to assert `/api/ingest` rejects `device_id` bodies and only accepts pseudonymized batches. Existing `npx vitest run src/routes/__tests__/observability.test.ts src/lib/__tests__/client-events.test.ts` executed cleanly.
- **References:** Mode A architecture brief (`docs/mode-a-operational-guidance.md:6-12`).

### P1-access-jwt-weak — audience-only verification is bypassable
- **Category:** Security
- **Where:** `src/lib/access.ts:148-179`
- **Evidence:** `jwtVerify(jwt, getJwks(env), { audience: env.ACCESS_AUD })` omits both `issuer` and `clockTolerance`. Anyone with a valid token for a different Access app (same account) or with slight clock skew can replay it.
- **Impact:** Attackers can reuse Access tokens minted for other apps or stale sessions to reach operator APIs, undermining RBAC and export controls.
- **Fix:** Include `issuer: deriveIssuer(env.ACCESS_JWKS_URL)` and a `clockTolerance` (e.g., 60s) in `jwtVerify`. Add negative tests covering mismatched issuer and stale tokens.
- **Tests:** Extend `src/lib/access.spec.ts` (or equivalent) with issuer/tolerance cases once added.
- **References:** Cloudflare Access JWT validation guidance.

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
- **Evidence:** `recordClientEvent` now derives `hashedEmail = hashUserEmailForStorage(record.userEmail, env.CLIENT_EVENT_TOKEN_SECRET)` and stores `sha256:<digest>` instead of the raw email. Tests cover deterministic hashing and null cases.
- **Impact:** Without the fix, every client event row exposed operator emails overseas. Hashing with a secret key keeps events linkable while meeting DROP requirements.
- **Fix:** Already merged. Ensure historical rows are backfilled (one-off SQL) to remove plaintext emails.
- **Tests:** `npx vitest run src/lib/__tests__/client-events.test.ts`.

### P1-ip-log-nested — rate limit logs still emit raw IPs
- **Category:** Privacy
- **Where:** `src/routes/ingest.ts:272-280`
- **Evidence:** When IP rate limiting triggers, `fields` includes `client_ip: ipDecision.ip`. Redaction only strips top-level `client_ip`, so nested `fields.client_ip` reaches log sinks.
- **Impact:** Raw IPs leave CN via structured logs, violating DROP rules and hampering residency claims.
- **Fix:** Omit the IP entirely or hash it before logging. Update logging tests to assert nested objects never contain `client_ip`.
- **Tests:** Add a regression test in `src/routes/__tests__/ingest.test.ts` once fixed.

### P1-overseas-schema-mismatch — `pseudoId` vs `didPseudo`
- **Category:** Correctness / Availability
- **Where:** `services/cn-gateway/src/ingest/exporter.ts:11-60`, `services/overseas-api/src/index.ts:7-66`
- **Evidence:** CN exporter enqueues `ExportRecord { pseudoId, ... }`, but overseas `ingestSchema` requires `pseudonymizedRecordSchema` (field `didPseudo`). Payloads therefore fail validation and never reach storage.
- **Impact:** Legitimate exports are dropped, forcing teams to keep the legacy raw ingest path (see P0).
- **Fix:** Align on a single field name (`didPseudo`) across exporter, SDK, and overseas API. Add contract tests covering round-trip batches.
- **Tests:** Add Vitest cases in `services/overseas-api/src/index.test.ts` for `pseudoId` vs `didPseudo` once refactored.

### P1-export-key-unset — signature verification disabled by config
- **Category:** Security / Availability
- **Where:** `services/overseas-api/wrangler.toml:5-8`, `services/overseas-api/src/index.ts:28-41`
- **Evidence:** `EXPORT_VERIFY_PUBKEY = ""`, so `verifyBatchSignature` returns 500 (“signing key not configured”) for every request. No secret binding exists.
- **Impact:** Either exports fail outright or operators comment out signature verification, defeating tamper protection.
- **Fix:** Store the Ed25519 public key via `wrangler secret put EXPORT_VERIFY_PUBKEY` and update `wrangler.toml`/docs to reflect secret-based configuration. Add a health-check that fails when the key is missing.
- **Tests:** Extend `services/overseas-api/src/index.test.ts` with a case asserting `500` when key absent and `202` when provided.

### P1-safe-metrics-drift — SDK vs CN gateway
- **Category:** Correctness / Compliance
- **Where:** `services/cn-gateway/src/modea/drop-safe.ts:1-16`, `packages/sdk-core/src/constants.ts:1-18`
- **Evidence:** SDK SAFE list includes `firmware_version_major_minor` and `alerts`, but CN gateway’s SAFE set lacks them. Clients believe those fields are exportable; the gateway silently drops them.
- **Impact:** Downstream analytics receive incomplete data and engineers might reintroduce those fields directly into overseas ingest (see P0) to “fix” missing metrics.
- **Fix:** Decide whether the additional fields are SAFE. If yes, add them to CN gateway SAFE list and sanitization. If no, remove them from SDK + documentation and add compile-time guards.
- **Tests:** Unit tests in SDK/CN gateway verifying SAFE arrays remain identical.

### P2-ingest-strip-silent — unexpected metrics quietly dropped
- **Category:** Correctness / Compliance
- **Where:** `src/schemas/ingest.ts:17-30`
- **Evidence:** Zod schema ends with `.strip()`, so unrecognized keys are silently removed. Operators receive `200 OK` even when devices send DROP/unsafe fields.
- **Impact:** Device firmware bugs slip through; compliance team loses visibility because bad payloads are not rejected/audited.
- **Fix:** Switch to `.strict()` and return 4xx errors plus audit logs when unexpected fields arrive.
- **Tests:** Extend `tests/integration/api-flows.integration.test.ts` with cases asserting rejection on extra keys.

### P2-modea-doc-drift — docs promise pseudonymized-only exports
- **Category:** Compliance / Documentation
- **Where:** `docs/mode-a-operational-guidance.md:6-12`, `src/routes/ingest.ts:260-565`
- **Evidence:** Docs state “Overseas stakeholders only see pseudonymized telemetry… No names, contact details, precise locations… leave China,” yet the Worker ingests raw identifiers and metrics.
- **Impact:** External regulators/auditors are misled; discovery of the gap would trigger immediate remediation orders.
- **Fix:** Either (preferable) implement the architecture described (see P0), or downgrade docs until reality matches vision. Require doc/code review tie-in.

## Testing Notes
- `npx vitest run src/routes/__tests__/observability.test.ts src/lib/__tests__/client-events.test.ts`
- Repo-wide scans stored at `.tmp/scan-*.txt` (deleted post-run) using `rg` patterns mandated in the engagement brief.

## 90-Day Remediation Roadmap
| Item | Owner | Window | Est. Hours (Opt / Likely / Pess) |
| --- | --- | --- | --- |
| Kill raw `/api/ingest` path; require pseudonymized batches (P0) | Worker Platform + CN Gateway | Days 0-14 | 40 / 60 / 90 |
| Harden Access JWT verify (issuer + tolerance) | Platform Auth | Days 0-14 | 6 / 10 / 16 |
| Align exporter schema + signature key wiring | Platform API | Days 0-21 | 12 / 18 / 30 |
| Publish Important-Data checklist + Mandarin notice | Compliance + Legal | Days 0-21 | 8 / 12 / 20 |
| SAFE metrics reconciliation (gateway vs SDK) | SDK Owners + CN Gateway | Days 15-45 | 16 / 24 / 36 |
| Strict schema & logging redactions | Worker Platform | Days 30-60 | 12 / 20 / 32 |
| CI wiring for forbidden-field/PII scanners | Release Engineering | Days 30-60 | 4 / 8 / 12 |
| Backfill hashed client_event emails | Data Engineering | Days 45-75 | 10 / 16 / 24 |
| Monitor/export verification health (key presence) | Platform Ops | Days 60-90 | 6 / 10 / 16 |

## Notes & References
- Mode A guardrail checklist refreshed in `MODEA_GUARDS_CHECKLIST.md`.
- Active P0/P1 triage tracked in `SECURITY_TRIAGE.md`.
- SBOM / licenses summarized in `SBOM_AND_LICENSES.md`.
- Open decisions captured in `OPEN_QUESTIONS.md`.
