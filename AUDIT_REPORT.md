# GreenBro Mode A Audit – November 2025

## Overview
Mode A now enforces the full CN?overseas contract: batches are pseudonymized and signed inside China, the overseas worker verifies Ed25519 signatures before parsing, legacy D1 rows containing raw device identifiers were purged, and ingest logs/metrics no longer emit identifiers. The remaining P1 work is largely documentary (guard checklist/doc drift) and UX (dashboard CSP). The mobile/dashboard apps and SDKs already respected SAFE metrics, so scope this pass to the infrastructure, ingestion, and guardrail tooling.

## Methodology
- Walked the workspace tree (`apps`, `services`, `packages`, `docs`, `ops`) to map entry points, configs, and guardrails.
- Ran `scripts/forbidden-fields-lint.js` + `scripts/pii-regex-scan.js` after expanding their coverage, and followed up on residual hits.
- Deep-read `services/cn-gateway` (pseudonymization, exporter, replay), `services/overseas-api` (env validation, ingest, signing, logging), and Mode A docs/checklists.
- Exercised the new ingestion flow via Vitest (`src/routes/__tests__/ingest.test.ts`) and kept env validation under test.

## Surface Grades
| Surface | Grade | Rationale |
| --- | --- | --- |
| `services/cn-gateway` | B | HMAC/KMS + replay protections intact; mapping stays CN-side. Errors table now stores HMACs but purge automation still TODO. |
| `services/overseas-api` | B- | Pseudonymous, signed ingest shipped; remaining gaps are documentation and CSP headers. |
| `apps/dashboard-web` | C | Still missing CSP/Permissions-Policy headers; otherwise solid SAFE consumption. |
| `apps/mobile` | B | SecureStore + telemetry handling already pseudonymous; no new work required. |
| SDKs (`sdk-core`, `sdk-web`, `sdk-rn`) | B | SAFE/DROP contracts exist; now shared directly with the worker. |
| Docs / Ops / Guardrails | B- | Guard scripts now cover the repo, but Mode A checklist/PR summary still need refreshed evidence. |

## Top Findings (post-remediation)
1. **P2-guard-backlog** - `pnpm guard:forbidden` still reports 1k+ P0 matches (e.g., `apps/mobile/test-mobile.json`, `services/overseas-api/src/routes/auth.ts`), so the signal stays red even when new regressions land.
2. **P2-doc-link-lint-gap** - Mode A guard checklists were refreshed manually, but no CI lint step verifies that evidence paths exist or that Pass/Fail rows align with automated checks.
3. **P2-dashboard-heavy-tests-skip** - `DeviceDetailPage` and `useApiRequest` suites skip unless `RUN_HEAVY_TESTS` is set, so local `pnpm test` omits telemetry/device-detail coverage by default.

## Remediations Delivered
| Area | Change |
| --- | --- |
| Overseas ingest | `services/overseas-api/src/routes/ingest.ts` now accepts SAFE `{ didPseudo }` batches, verifies Ed25519 signatures, and records only pseudonymous IDs. |
| Data hygiene | `migrations/0022_purge_raw_device_ids.sql` wipes legacy rows so no raw device identifiers remain overseas. |
| Logging | Ingest logging + ops metrics drop `deviceId` fields; CN errors table HMACs `deviceIdRaw`. |
| Guardrails | `scripts/forbidden-fields-lint.js` and `scripts/pii-regex-scan.js` now scan apps/services/docs/ops instead of a handful of prefixes. |
| Config safety | `env.ts` requires `EXPORT_VERIFY_PUBKEY` outside localhost and hard-fails `ALLOW_RAW_INGEST` prod configs. |

## 90-day Remediation Roadmap
| Window | Item | Owner | Hours (Opt / Likely / Pess) |
| --- | --- | --- | --- |
| Days 0-14 | Update Mode A guard checklist + PR summary with fresh evidence; wire a doc linter that verifies cited files exist. | Compliance Lead | 6 / 10 / 14 |
| Days 0-14 | Encode/remove remaining DEV_ALLOW_USER fixtures so guard jobs are green. | Platform API Lead | 4 / 6 / 8 |
| Days 15-30 | Add CSP + Permissions-Policy headers via the overseas worker for `apps/dashboard-web`. | Frontend Lead | 8 / 12 / 18 |
| Days 31-60 | Automate dual-control evidence capture (mapping-table access, Ed25519 rotation logs). | Security & Ops | 16 / 24 / 32 |
| Days 45-90 | Re-run full Mode A rehearsal (dual-control + exporter failover) & document playbooks; add automated monitoring for signature drift. | Compliance Lead | 16 / 24 / 36 |

## Verification
- `pnpm --filter @greenbro/overseas-api exec vitest run src/__tests__/env.validation.test.ts`
- `pnpm --filter @greenbro/overseas-api exec vitest run src/routes/__tests__/ingest.test.ts`
