# Mode A Audit Report - 2025-11-11

## Overview
- **Scope**: services (cn-gateway, overseas-api), worker (`src`), apps (dashboard-web, mobile), SDKs, docs/ops tooling, CI/Mode A guardrails.
- **Method**: repo-wide static review, required regex scans, schema diffs, targeted test runs (`npm test -- --run` inside `services/cn-gateway`).
- **Surface grades**:
  | Surface | Grade | Notes |
  | --- | --- | --- |
  | cn-gateway | B- | Strong sanitization/KMS, but exporter queue is volatile and required TLS/signature fixes.
  | overseas-api | F | Authn missing between CN exporter and worker; batches are simply dropped today.
  | dashboard-web | B | UI sticks to pseudonymous IDs but depends on overseas worker storing data correctly.
  | mobile (React Native) | B | Secure cookie storage + telemetry gating; no Mode A violations spotted in sampled flows.
  | SDKs (core/web/rn) | B+ | Strict Zod schemas & pseudonymize helpers align with Mode A.
  | docs/ops | B | SOPs/runbooks present, but Mode A guard scripts ignore entire docs tree (risk of unvetted PII).

## Key Findings
Each finding lists evidence (file + line), impact, and remediation. IDs ending in *(fixed)* were addressed in `fixes.patch`.

1. **P0-db-tls-disabled (fixed)** - `services/cn-gateway/src/db/pool.ts` (pre-fix lines 10-18 via `git show HEAD^`). Production pools set `ssl: { rejectUnauthorized: false }`, allowing MITM on Postgres credentials + mapping table. *Fix*: enforce CA validation with optional `PGSSLROOTCERT`; regression covered by existing Vitest suite.
2. **P1-missing-device-signature (fixed)** - `services/cn-gateway/src/ingest/routes.ts` (pre-fix lines 70-85). The gateway silently accepted ingest requests without `X-Device-Signature`, so anyone could spoof telemetry. *Fix*: throw `device_signature_missing`, extend Vitest integration/e2e cases to sign every payload and assert 401s when absent.
3. **P1-nginx-ip-logs (fixed)** - `services/cn-gateway/docker/nginx.conf` (lines 7-14 before patch) logged `$remote_addr` and `X-Forwarded-For`, violating “no raw IPs in logs.” *Fix*: switch to a `privacy` format that redacts client IP fields.
4. **P0-export-auth-missing** - `services/cn-gateway/src/ingest/exporter.ts:20-73` vs. `services/overseas-api/src/index.ts:55-107`. Exporter never attaches a Cloudflare Access JWT or `Authorization` bearer token, while the overseas worker rejects every request without those headers. No sanitized batch will ever be accepted in production. *Remedy*: inject Access service tokens (e.g., `CF-Access-Client-Id/Secret` headers or a mTLS tunnel) before enabling exports; add contract tests that the exporter receives 202s from `wrangler dev`.
5. **P0-overseas-drop** - `services/overseas-api/src/index.ts:33-76`. After verifying Access + Ed25519 signatures, the worker simply returns `{status:"queued"}` and never writes to D1, R2, or another service. Turning on CN exports would black-hole all telemetry/heartbeats. *Remedy*: persist `records` into the real dashboard worker (likely via queue or direct D1 writes) and add integration tests proving round-trip storage.
6. **P0-raw-deviceids-overseas** - Worker still ingests/stores raw IDs (`src/schemas/ingest.ts:17-48`, `migrations/0001_init.sql:1-40`, `src/routes/ingest.ts:246-563`, `src/lib/ops-metrics.ts:20-36`). `log.with({ device_id })` and `ops_metrics.device_id` put human-readable IDs into Cloudflare logs and D1, breaking Mode A. *Remedy*: retire the raw `/api/ingest` path, require pseudonymized `did_pseudo` everywhere, and HMAC/seal any IDs that must live overseas.
7. **P1-safe-metrics-not-enforced** - `src/schemas/ingest.ts:17-29` still accepts `tankC`, `ambientC`, `compCurrentA`, etc., none of which are in `SAFE_METRICS`. If `ALLOW_RAW_INGEST` flips on, non-whitelisted fields immediately leave China. *Remedy*: drop the legacy schema or wrap it in Mode-A sanitization (reuse `packages/sdk-core` validators) before any data is stored.
8. **P1-observability-pii** - `src/schemas/observability.ts:17-33,53` + `src/routes/observability.ts:211-275` use `.passthrough()` and log `extras` verbatim as long as payloads are <4 KB. A malicious UI could include `email` or GPS in `extras`/`tags` and the worker would emit it to Cloudflare. *Remedy*: switch schemas to `.strict()`, strip forbidden keys, and only log allowlisted scalar tags.
9. **P1-export-queue-volatile** - `services/cn-gateway/src/ingest/exporter.ts:20-116` keeps batches solely in-memory (`private readonly queue: ExportRecord[] = []`). A pod restart drops everything enqueued but not flushed, violating durability expectations. *Remedy*: persist the queue (e.g., Postgres table or Redis list) and add recovery tests before enabling Mode A exports.
10. **P2-guard-ignores-docs** - `SCRIPTS/forbidden-fields-lint.js:55-70` ignores `docs/`, `README*`, and every markdown/glossary file. Sensitive phrases can enter runbooks/privacy notices with zero CI coverage, eroding the “no exceptions” control. *Remedy*: remove those ignore patterns (allow per-file allowlists instead) and surface guard results in CI for docs PRs.

## 90-Day Remediation Roadmap
| Window | Item | Owner | Est. (O/M/P hrs) |
| --- | --- | --- | --- |
| Days 0-14 | Wire CN exporter to Cloudflare Access (service token or mTLS) and add integration tests proving 202s | Platform API Lead | 8 / 12 / 18 |
| Days 0-14 | Implement durable queue/DB sink for `BatchExporter` + health alerting on backlog | Platform API Lead | 12 / 18 / 30 |
| Days 0-14 | Implement real overseas ingest pipeline (persist batches into D1/worker, replay tests) | Worker Platform Lead | 20 / 28 / 40 |
| Days 15-45 | Migrate dashboard/mobile to pseudonymous IDs end-to-end; delete `ALLOW_RAW_INGEST` path and sanitize legacy rows | App Platform Lead + Compliance | 32 / 48 / 72 |
| Days 30-60 | Harden observability reporters (strict schemas, drop extras/tags PII) and expand Mode A guard coverage to docs | App Platform Lead | 10 / 16 / 24 |
| Days 45-90 | Re-run full Mode A rehearsal (dual-control, exporter failover) & document playbooks; add automated checks for Access/JWKS drift | Compliance Lead | 16 / 24 / 36 |

## Mode A Assertions & Guardrails
- **Drop/SAFE enforcement**: Verified at CN gateway (`services/cn-gateway/src/modea/sanitize.ts`) and SDKs (`packages/sdk-core/src/schemas.ts`). Overseas worker path still accepts raw metrics (Finding #7).
- **Logs**: After this PR Nginx redacts IPs; worker logging still emits `device_id` (Finding #6)  and needs follow-up.
- **Key management**: `config.ts` / `kms` enforce KMS-only HMAC + Ed25519 signing; rotation endpoint writes audit log. TLS to Postgres now verifies CA.
- **Replay & rate limits**: `ReplayDefense` (+/-120s) + per-device rate limiter + Access JWT checks for dashboards.
- **CI guardrails**: `full-ci` runs forbidden-field + PII scans, but scripts skip docs (Finding #10).

## Tests Executed
- `npm test -- --run` (inside `services/cn-gateway`) - covers unit, integration, and exporter e2e flows after the fixes above.
