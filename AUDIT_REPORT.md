# GreenBro Mode A Audit – November 2025

## Overview
Mode A requires that all device telemetry is pseudonymized inside mainland China, only SAFE metrics cross the border, and every downstream consumer enforces DROP/SAFE, signature, and replay guardrails. I reviewed the entire monorepo (services, apps, SDKs, docs, CI) with a focus on P0/P1 risks. Two show‑stoppers emerged in the overseas API: it still ingests and stores raw `device_id` values, and it never verifies the CN gateway’s Ed25519 batch signatures despite documentation claiming otherwise. Together they void the Mode A segregation story. Additional P1 gaps include leaking raw identifiers into logs/metrics, ability to re‑enable raw ingest with a single flag, and schema drift that makes the CN exporter incompatible with the overseas worker. Guardrail tooling and docs lag reality, so CI scans do not cover docs/tests and operator guides list guardrails as “Pass” even when the code disagrees.

## Methodology
- Walked the workspace tree (`apps`, `services`, `packages`, `docs`, `ops`) to map entry points, configs, and guardrails.
- Ran the existing guard scripts (`node scripts/forbidden-fields-lint.js`, `node scripts/pii-regex-scan.js`) and manually followed up on their findings.
- Deep‑read high‑risk areas: `services/cn-gateway` (ingest, KMS, exporter), `services/overseas-api` (routes, env validation, logging), and Team docs (Mode A audits, SOPs, checklists).
- Spot‑checked mobile/dashboard apps for a11y/DX regressions, and SDKs for SAFE/DROP definitions.
- Added regression tests (`pnpm --filter @greenbro/overseas-api exec vitest run src/__tests__/env.validation.test.ts`) to cover the fixes shipped in this pass.

## Surface Grades
| Surface | Grade | Rationale |
| --- | --- | --- |
| `services/cn-gateway` | B- | Pseudonymization/KMS are solid, but the `errors` table was recording raw device IDs (fixed here) and there is no automated purge/migration yet. |
| `services/overseas-api` | D | Still processes raw `device_id`, lacks signature verification, and logs/stores identifiers everywhere. |
| `apps/dashboard-web` | C | SPA ships without CSP/hardening headers; relies entirely on edge defaults. |
| `apps/mobile` | B | Good SecureStore usage and accessible touch targets; no high-risk findings this pass. |
| SDKs (`sdk-core`, `sdk-web`, `sdk-rn`) | B | SAFE/DROP contracts defined but no runtime enforcement tying them back to exporter schema. |
| Docs / Ops / Guardrails | C- | Guard checklists and SBOMs reference protections that do not exist; CI scanners skip entire directories. |

## Top Findings
1. **P0-overseas-raw-ingest** – `/api/ingest/:profile` in the overseas Worker still expects `device_id`, `faults`, `rssi`, and writes them straight into D1 (`services/overseas-api/src/routes/ingest.ts:342-563`, `services/overseas-api/src/schemas/ingest.ts:34-53`). This exports raw identifiers and violates Mode A.
2. **P0-missing-export-verification** – Docs claim “Batch exports signed & verified” (e.g. `docs/mode-a/audit-2025-11-11/pr-summary.md:4`), but nothing in `services/overseas-api` references `x-batch-signature` or `EXPORT_VERIFY_PUBKEY`. `/health` (`services/overseas-api/src/routes/health.ts:1-5`) just returns `{ ok: true }`.
3. **P1-logs-leak-device-id** – `logAndRecordEarlyExit` and `recordOpsMetric` propagate raw `device_id` into Cloudflare logs and D1 tables (`services/overseas-api/src/routes/ingest.ts:247-367`, `services/overseas-api/src/lib/ops-metrics.ts:31-53`), contradicting the “No raw IDs/IPs leave CN” guarantee.
4. **P1-allow-raw-ingest** – A single `ALLOW_RAW_INGEST` flag bypassed the Mode A gateway without environment gating (fixed in `services/overseas-api/src/env.ts:242-270` plus tests).
5. **P1-schema-drift** – CN exporter emits `{ didPseudo, keyVersion, SAFE metrics }`, but the overseas schemas/tests still expect `{ device_id, ts, tankC, ambientC, ... }` (`services/overseas-api/src/schemas/ingest.ts`, `services/cn-gateway/src/ingest/routes.ts:82-101`), so even a signed batch would fail parsing.
6. **P1-doc-drift** – Mode A reports/checklists mark export signing, safe metrics, and shim removal as “Pass” while the code says otherwise (`docs/mode-a/audit-2025-11-11/mode-a-guardrail-checklist.md:5-7`, `docs/mode-a/audit-2025-11-11/pr-summary.md:4`). Compliance teams rely on inaccurate evidence.
7. **P2-guard-coverage-gap** – `scripts/forbidden-fields-lint.js:24-63` and `scripts/pii-regex-scan.js:10-43` only look under a few prefixes and skip docs/tests, so CI never scans the privacy notices, SOPs, or wrangler configs that actually contain strings like `email`, `ip`, etc.
8. **P2-fixture-pii** – Test fixtures and wrangler defaults hard-code `DEV_ALLOW_USER='{"email":"..."}'` (`services/overseas-api/tests/integration/access-shim.integration.test.ts:22`, `services/overseas-api/wrangler.toml:122`), which trips the forbidden-field gate and leaves sample PII in git.
9. **P2-dashboard-csp** – `apps/dashboard-web/index.html:1-10` ships without any CSP/`Permissions-Policy` meta or headers, leaving the SPA exposed to whatever defaults the Worker proxy chooses.
10. **P2-guard-checklist-pass-wrong** – `docs/guardrails/MODEA_GUARDS_CHECKLIST.md:6` still lists “Batch exports signed & verified | Pass | services/overseas-api/src/index.ts”, even though that file no longer exists and the worker does zero verification.

## Detailed Findings & Status
Each finding is documented (ID, severity, evidence, impact, fix/test status) in `findings.json`. Highlights:
- Fixed **P1-allow-raw-ingest** by gating the flag to localhost/test environments, covering it with Vitest, and extending the shim CI script.
- Fixed **P1-errors-table-pii** (tracked under the broader raw-ID finding) by hashing device IDs before inserting into `errors`.
- The remaining P0/P1 issues (raw ingest, missing verification, schema drift, logging) require code/infra work beyond this pass and are captured in `SECURITY_TRIAGE.md`.

## Remediations Delivered This Pass
| Area | Change |
| --- | --- |
| CN gateway errors table | `recordErrorEvent` now HMACs device IDs before inserting, avoiding fresh PII in `errors`. |
| Raw ingest flag | `services/overseas-api/src/env.ts` rejects `ALLOW_RAW_INGEST` unless both `ENVIRONMENT` and `APP_BASE_URL` are local; new Vitest coverage exercises both outcomes. |
| Shim CI check | `scripts/ensure-prod-shim-disabled.mjs` also blocks `ALLOW_RAW_INGEST` secrets during deploys. |

## 90-Day Remediation Roadmap
| Window | Item | Owner | Hours (Opt / Likely / Pess) |
| --- | --- | --- | --- |
| Days 0‑14 | Ship pseudonymous ingestion path for overseas API (`didPseudo`, SAFE metrics only) and disable legacy raw ingest permanently. | Platform API Lead + CN Gateway Lead | 32 / 48 / 72 |
| Days 0‑14 | Enforce Ed25519 `EXPORT_VERIFY_PUBKEY` verification + `/health` drift alarms. | Platform API Lead | 16 / 24 / 36 |
| Days 0‑14 | Scrub existing D1 tables/logs of raw `device_id`, replace with pseudonymous IDs, and add automated redaction tests. | Compliance Eng + Data Ops | 24 / 32 / 48 |
| Days 15‑30 | Align schemas/tests between CN exporter & overseas worker; add contract tests in CI. | SDK/Core Lead | 24 / 32 / 40 |
| Days 15‑30 | Extend guard scripts to cover docs/tests; add allowlist for deliberate cases. | DevEx | 8 / 12 / 18 |
| Days 31‑60 | Lock down SPA security headers (CSP, Permissions-Policy) via Worker middleware + dashboard docs. | Frontend Lead | 12 / 16 / 24 |
| Days 31‑60 | Refresh Mode A docs (checklist, SBOM, risk register) with real evidence links and quarterly review cadence. | Compliance Lead | 10 / 16 / 20 |
| Days 61‑90 | Automate evidence capture (dual-control audits, signature health) and bake into release gates. | Security & Ops | 20 / 28 / 36 |

Owners are mirrored in `RISK_REGISTER.md` and `SECURITY_TRIAGE.md` so that accountability survives this review.

## Verification
- `pnpm --filter @greenbro/overseas-api exec vitest run src/__tests__/env.validation.test.ts`

No other automated suites were run; overseas ingest still requires larger architectural changes before meaningful end-to-end tests can pass.
