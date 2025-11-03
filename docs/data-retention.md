# Data Retention & Archival Policy

## Policy Alignment
- **Scope**: Operational telemetry, MQTT webhook payloads, and derived operations metrics collected by the Worker.
- **Retention horizon**: 90 days of online history in D1. This aligns with product's requirement for seasonal diagnostics while limiting storage growth and privacy exposure.
- **Effective date**: Applies immediately to all production and staging environments once the cron trigger is deployed.
- **Overrides**: Environments may tighten the window (e.g., GDPR requests) via the `TELEMETRY_RETENTION_DAYS` variable but should not exceed 180 days without product approval.

## Automated Cleanup
- A cron-triggered Worker job runs daily at **02:15 UTC** (`TELEMETRY_RETENTION_CRON = "15 2 * * *"`).
- The job (`src/jobs/retention.ts`) performs the following per run:
  - **telemetry**: exports batches of rows older than the cutoff to NDJSON in R2, then deletes them from D1.
  - **mqtt_webhook_messages**: same backup-and-delete flow keyed by `inserted_at`.
  - **ops_metrics**: direct delete (no archive; metrics are transient).
- Successful runs emit structured logs (`cron.retention.*`) and summary counts.

## Configuration
| Setting | Default | Notes |
| --- | --- | --- |
| `TELEMETRY_RETENTION_DAYS` | `90` | Integer days of live history in D1. |
| `RETENTION_BACKUP_PREFIX` | `data-retention` | R2 prefix for archived NDJSON batches. |
| `RETENTION_BACKUP_BEFORE_DELETE` | `false` | Set to `true` to block deletion unless an archive bucket is configured. |
| `RETENTION_ARCHIVE` | — | Optional R2 binding dedicated to retention archives. Falls back to `GB_BUCKET` if unset. |

> ⚠️ **Recommended**: Bind a dedicated R2 bucket (e.g., `greenbro-telemetry-archive`) as `RETENTION_ARCHIVE` to isolate customer data from marketing assets.

## Backups & Validation
1. Ensure the target R2 bucket exists per environment (`wrangler r2 bucket create greenbro-telemetry-archive`).
2. Verify write access by running the job once in dry mode:
   ```bash
   wrangler dev --test-scheduled "15 2 * * *"
   ```
   Check for log entries `retention.batch_backed_up` and inspect the bucket contents.
3. Retrieve a batch for validation:
   ```bash
   wrangler r2 object get RETENTION_ARCHIVE data-retention/<job-id>/telemetry/batch-0001.ndjson
   ```
4. Store long-term archives in the warehouse (e.g., BigQuery/Snowflake) per Observability playbook.

## Manual Operations
- Trigger a one-off cleanup (production):
  ```bash
  wrangler cron trigger --cron "15 2 * * *"
  ```
- Run locally against the Miniflare DB:
  ```bash
  npm run migrate:apply:local
  wrangler dev --test-scheduled "15 2 * * *"
  ```
- If backups must precede deletion manually, set `RETENTION_BACKUP_BEFORE_DELETE="true"` temporarily and confirm archives before toggling back.

## Covered Tables
- `telemetry` (device history; batched export + delete).
- `mqtt_webhook_messages` (webhook payload audit trail; batched export + delete).
- `ops_metrics` (operational counters; delete only).

Any new high-churn tables should be added to `src/jobs/retention.ts` and documented here.
