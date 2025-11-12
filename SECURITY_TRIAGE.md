# Security Triage (P0/P1, 48-hour actions)

| ID | Severity | Owner | 48h Action Plan |
| --- | --- | --- | --- |
| P0-overseas-raw-ingest | P0 | Platform API Lead + CN Gateway Lead | ? Signed batch ingest deployed, legacy D1 rows purged via 0022_purge_raw_device_ids.sql, and vitest coverage added. Continue monitoring ingest.batch_failed and /api/ingest logs for regressions. |
| P0-export-signature-missing | P0 | Security Engineering | ? EXPORT_VERIFY_PUBKEY is now mandatory and verifyBatchSignature enforces Ed25519 signatures. Follow-up: add health alarms for signature verification failures. |
| P1-logs-leak-device-id | P1 | Observability Lead | ? Ingest logging/ops metrics no longer persist device IDs. Keep log shipping filters and add automated scans for regressions. |
| P1-allow-raw-ingest-unguarded | P1 | Platform API Lead | ? Env validation + shim CI gate block ALLOW_RAW_INGEST outside localhost. Add alerting on validation failures as a follow-up. |
| P1-schema-drift-didPseudo | P1 | SDK/Core Lead | ? Worker now consumes the SAFE ExportBatchSchema; stay aligned with future sdk-core SAFE metric updates. |
| P1-modea-doc-drift | P1 | Compliance Lead | 1) Redline the existing guard checklist/pr summary to mark blockers; 2) Require fresh evidence links (health endpoints, CI artifacts) before re-marking anything as Pass; 3) Notify legal/regulatory stakeholders of the discrepancy. |

