# Security Notes – Mode A CN Gateway

## Threat Model (STRIDE-lite)

| Threat | Surface | Mitigation |
| --- | --- | --- |
| **Spoofing** | Devices faking identity | Mutual TLS enforced by nginx (`ssl_verify_client on`), optional `X-Device-Signature` HMAC check per request, pseudonymization backed by CN-resident KMS keys. |
| **Tampering** | Payload mutation or PI leakage | Ajv 2020-12 schema with `additionalProperties: false`, Mode A DROP/SAFE enforcement plus regex scrubbing, timestamp rounding, never logging raw payloads. |
| **Repudiation** | Lost audit history | Append-only `audit_log` (actors/actions/ip_hmac) + `errors` tables, pino JSON logs with correlation IDs, admin operations recorded via `/admin/rotate-key`. |
| **Information disclosure** | PII leakage or key spillage | Pseudonymized identifiers only, Postgres holds hashed IPs (`ip_hmac`), Ed25519/HMAC keys never logged, metrics avoid IDs, exports include SAFE metrics only. |
| **Denial of Service** | High-volume devices, replay | Per-device token bucket (memory or Redis), seq ring (size 5) + ±120s skew window, Redis-backed idempotency TTL (24h) to short-circuit retries. |
| **Elevation of privilege** | Unauthorized rotations/exports | `/admin/rotate-key` gated by `X-Admin-Token` + TOTP using `ADMIN_TOTP_SECRET`, audit log entry per action, exporter only posts to configured overseas base and signs each batch. |

## Key Custody & Rotation
- **HMAC pseudonymization keys** live in CN KMS (Alibaba/Tencent/Huawei adapters). The service only receives MAC digests, never raw keys. Use CSP-native rotation, update `KMS_KEY_VERSION`, call `/admin/rotate-key`, redeploy with refreshed env.
- **Dev adapter** (`KMS_PROVIDER=dev`) is for local testing only. `DEV_KMS_KEY` must not be used in production.
- **Ed25519 export keys** reside on disk inside CN infra (e.g., `/run/keys/export_ed25519.key`). They should be owned by an HSM or KMS-backed signing service in production. The code reads the private key once and signs batches; public key is shared with overseas ingest teams for verification.

## Monitoring & Incident Response
1. **Baseline metrics**: Track `cn_gateway_ingest_requests_total`, latency histograms, rate-limit rejects, and exporter failure counters. Alert on sustained spikes or repeated failures.
2. **Audit trail**: `audit_log` captures admin actions (`actor`, `action`, `details`, `ip_hmac`). `errors` table captures sanitization rejects, rate-limit events, and replay detections. Export logs capture `batch_id`, status, checksum, and HTTP code.
3. **Rotation SOP**: 
   - Rotate CSP KMS keys (per provider docs) and record the new version.
   - POST `/admin/rotate-key` with the new version + TOTP to update runtime config and audit the change.
   - Redeploy pods/containers with updated `KMS_KEY_VERSION` env and verify `/health` reflects the new version.
4. **Suspected re-identification**:
   - Freeze exports by setting `EXPORT_ENABLED=false` (redeploy or patch env).
   - Query `audit_log`/`errors` for offending pseudo IDs; involve counsel before sharing data outside CN.
   - Regenerate pseudonyms by rotating the HMAC key and forcing remapping (requires new KMS version).

## Logging & Data Residency
- Logs use pino JSON with aggressive header/body redaction (authorization, device signatures, admin headers, metrics blobs).
- Prometheus metrics avoid high-cardinality labels and never include device identifiers.
- All stateful services in this stack (Postgres, Redis, nginx, Fastify) are intended to run inside Mainland China. Only SAFE technical metrics leave CN, and those are wrapped in signed batches for overseas ingest.

## Legal & Compliance Reminder
This repository focuses on technical controls aligned with Mode A ingestion. It is **not** legal advice. Deployments should undergo counsel review (export classification, CAC filings, data residency mapping, contractual commitments). This blueprint likely avoids additional filings for this telemetry stream, subject to counsel confirmation.
