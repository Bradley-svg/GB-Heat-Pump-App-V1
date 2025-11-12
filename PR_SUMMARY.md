# PR Summary

## What changed
1. **End-to-end pseudonymous ingestion** - /api/ingest/:profile now accepts CN gateway batches (services/overseas-api/src/routes/ingest.ts) backed by the SAFE ExportBatchSchema, purges legacy raw data (migrations/0022_purge_raw_device_ids.sql), and stores only didPseudo identifiers.
2. **Ed25519 signature verification** - services/overseas-api/src/utils/ed25519.ts validates x-batch-signature with the Wrangler-supplied public key, and env.ts rejects non-local deployments without EXPORT_VERIFY_PUBKEY.
3. **Logging/metrics redaction** - ingest logging no longer emits per-device identifiers and ops metrics record only route-level aggregates.
4. **Guard automation** - scripts/forbidden-fields-lint.js and scripts/pii-regex-scan.js now scan apps, services, docs, and ops folders so Mode A gates cover the entire repo.
5. **Safety net cleanup** - recordErrorEvent HMACs device IDs before persisting, keeping CN gateway audit tables pseudonymous.

## Why
These changes deliver the P0/P1 roadmap: overseas telemetry can only flow through a signed, pseudonymized channel; historical PII was purged; raw-ingest toggles are locked down; and guardrails run across every directory so future drifts are caught in CI.

## Risk / Migrations
- **D1 purge:** 0022_purge_raw_device_ids.sql deletes historical devices/latest_state/telemetry/ingest_batches/ingest_heartbeats/ops_metrics rows. Run wrangler d1 migrations apply GREENBRO_DB before enabling exports; dashboards must tolerate repopulation.
- **Config:** Production/staging envs must set EXPORT_VERIFY_PUBKEY (PEM) and ensure ALLOW_RAW_INGEST secrets are absent or validation will fail.

## Tests
- pnpm --filter @greenbro/overseas-api exec vitest run src/__tests__/env.validation.test.ts
- pnpm --filter @greenbro/overseas-api exec vitest run src/routes/__tests__/ingest.test.ts

