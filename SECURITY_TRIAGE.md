# Security Triage (P0/P1)
| ID | Severity | Owner | 48-hour Plan |
| --- | --- | --- | --- |
| P0-db-tls-disabled | P0 | Platform API Lead | **Done in this PR.** Roll out config with `PGSSLROOTCERT` in lower envs today, prod deploy once secrets are set. |
| P1-missing-device-signature | P1 | Platform API Lead | **Done in this PR.** Ship gateway build + monitor new 401 metric for unsigned traffic. |
| P1-nginx-ip-logs | P1 | Platform API Lead | **Done in this PR.** Roll out the nginx log-format change with the gateway deploy. |
| P0-export-auth-missing | P0 | Platform API Lead | Generate Cloudflare Access service token, add auth headers in exporter, verify via wrangler dev within 48h. |
| P0-overseas-drop | P0 | Worker Platform Lead | Stub persistence layer (e.g., write batches to D1) and add a smoke test that counts stored rows before enabling exporter. |
| P0-raw-deviceids-overseas | P0 | App Platform Lead + Compliance | Freeze `/api/ingest` exposure (leave ALLOW_RAW_INGEST unset), start plan to require did_pseudo everywhere, and stop exporting ops_metrics.device_id beyond masked tokens. |
| P1-safe-metrics-not-enforced | P1 | App Platform Lead | Block any attempt to enable raw ingest until schemas wrap SAFE_METRICS; add CI check quoting sdk-core constants. |
| P1-observability-pii | P1 | App Platform Lead | Lock down `ClientErrorReportSchema` to `.strict()` and drop extras/tags in code before the next release; add regression test. |
| P1-export-queue-volatile | P1 | Platform API Lead | Persist queue to Postgres temporarily (single table + cron backfill) while designing durable queue; alert on exporter retries. |
