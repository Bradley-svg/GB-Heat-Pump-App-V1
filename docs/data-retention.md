# Data Retention & Archival Policy

## Policy Alignment
- **Scope**: Operational telemetry, MQTT webhook payloads, and derived operations metrics collected by the Worker.
- **Retention horizon**: 90 days of online history in D1. This aligns with product requirements for seasonal diagnostics while limiting storage growth and privacy exposure.
- **Effective date**: Applies immediately to all production and staging environments once the cron trigger is deployed.
- **Overrides**: Environments may tighten the window (for example, GDPR requests) via the `TELEMETRY_RETENTION_DAYS` variable but should not exceed 180 days without product approval.

## Automated Cleanup
- A cron-triggered Worker job runs daily at 02:15 UTC (`TELEMETRY_RETENTION_CRON = "15 2 * * *"`).
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
| `RETENTION_BACKUP_BEFORE_DELETE` | `false` | Gate deletions on backups; set to `true` via `wrangler secret put` for production and staging before enabling the cron. |
| `RETENTION_ARCHIVE` | n/a | Optional R2 binding dedicated to retention archives. Falls back to `GB_BUCKET` if unset. |

> Recommended: Bind dedicated R2 buckets (`greenbro-telemetry-archive` for production, `greenbro-telemetry-archive-dev` for preview/dev) as `RETENTION_ARCHIVE` to isolate customer data from marketing assets.

## Verification & Validation
1. Confirm archive buckets exist and match expectations:
   ```bash
   npx wrangler r2 bucket list | rg telemetry-archive
   ```
   Ensure both `greenbro-telemetry-archive` and `greenbro-telemetry-archive-dev` are present and active.
2. Check Worker bindings before deploy:
   - `wrangler.toml` must map `RETENTION_ARCHIVE` to `greenbro-telemetry-archive` with `preview_bucket_name = "greenbro-telemetry-archive-dev"`.
   - `npx wrangler deployments status` should list the binding on the target Worker prior to destructive runs.
3. Simulate a retention run with logging enabled:
   ```bash
   npx vitest run src/jobs/__tests__/retention.test.ts --reporter verbose
   ```
   Confirm every `retention.batch_backed_up` log appears before the matching `retention.table_completed` entry and that the test asserts backups exist before deletions.
4. Retrieve a batch for validation:
   ```bash
   wrangler r2 object get RETENTION_ARCHIVE data-retention/<job-id>/telemetry/batch-0001.ndjson
   ```
5. Store long-term archives in the warehouse (for example, BigQuery or Snowflake) per the Observability playbook.

## Manual Operations
- Trigger a one-off cleanup (production):
  ```bash
  wrangler cron trigger --cron "15 2 * * *"
  ```
- Run locally against the Miniflare database:
  ```bash
  npm run migrate:apply:local
  wrangler dev --test-scheduled "15 2 * * *"
  ```
- If backups must precede deletion manually, set `RETENTION_BACKUP_BEFORE_DELETE="true"` temporarily and confirm archives before toggling back.

## Covered Tables
- `telemetry` (device history; batched export then delete).
- `mqtt_webhook_messages` (webhook payload audit trail; batched export then delete).
- `ops_metrics` (operational counters; delete only).

Any new high-churn tables should be added to `src/jobs/retention.ts` and documented here.
