# Risk Register
| Risk | Likelihood | Impact | Mitigation | Early Warning Signal | Owner |
| --- | --- | --- | --- | --- | --- |
| Exporter still unauthenticated against overseas worker | High | Batches never leave CN; dashboards/mobile go dark | Ship service-token/mTLS auth + integration tests within 14 days | `/api/ingest` responses != 202, exporterBatches{status="failed"} spikes | Platform API Lead |
| Overseas worker drops sanitized batches even after auth | High | Irrecoverable telemetry loss + compliance breach | Build persistent ingest path (queue/D1) and monitor stored-count vs. batch-count | Health check showing `signatureConfigured:true` but zero ingest rows over time | Worker Platform Lead |
| Legacy worker stores raw device IDs/logs | Medium | Mode A violation + regulator escalation | Replace `/api/ingest` with pseudonymous pipeline, seal IDs before logging | Mode A guard detecting `device_id` in responses/logs | Compliance + App Platform |
| Guard scripts ignore docs/markdown | Medium | Sensitive language sneaks into runbooks/privacy notices | Remove ignore patterns; add doc-only CI job | Mode A guard workflow includes docs and starts failing PRs | Dev Productivity |
| Export queue volatile in cn-gateway | Medium | Crash/deploy silently drops pending telemetry | Persist queue in DB/Redis and alert on resend backlog | Export metrics show `status="failed"` with `queue_size` reset to 0 after restart | Platform API Lead |
