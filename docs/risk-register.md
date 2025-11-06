# GreenBro Risk Register

| Risk | Likelihood | Impact | Mitigation | Early Warning Signal | Owner |
| --- | --- | --- | --- | --- | --- |
| Cloudflare Access shim accidentally left on in shared environments, granting admin access without SSO | Low | High | Centralize `withAccess` guard, gate shim behind `ENVIRONMENT` flag, add CI check (`npm run check:prod-shim`) and deployment checklist updates | `access.dev_shim_used` log outside `development`; CI failures on shim check | Security |
| Telemetry refactor diverges from legacy responses, degrading dashboards | Medium | High | Keep `compare` mode with structured mismatch logs, add automated diff tests, and monitor alert thresholds before enabling `refactor` in production | Burst of `telemetry.refactor.shadow_mismatch` logs or Datadog alert on dashboard deltas | Backend |
| D1 query load from batch/series endpoints breaches service limits during fleet growth | Medium | High | Add request caps (devices/time range), benchmark with synthetic load, consider caching hot fleets, and stage rollouts | Rising latency in ops metrics, D1 rate-limit warnings, 5xx errors from telemetry routes | Backend |
| Ingest DoS due to per-request D1 rate-limit checks without upstream throttling | Low | Medium | Enforce the KV-backed IP token bucket (`INGEST_IP_BUCKETS`) ahead of D1, alert on fallback to in-memory buckets, and continue tuning heartbeat cadence | Spike in `ingest.rate_limited` logs with matching `ingest.ip_kv_bucket_failed` warnings or rising D1 CPU | Platform Ops |
| Retention job misconfiguration leading to data loss without backup | Low | High | Enforce `RETENTION_BACKUP_BEFORE_DELETE=true` in production, monitor cron logs, and schedule periodic restore drills | Missing `retention.batch_backed_up` log prior to deletes, Datadog alert on retention job failures | Platform Ops |
| SPA + Worker config drift (asset base/API base mismatches) causing 404s | Medium | Medium | Maintain publish script, validate manifest in CI, and add health checks verifying asset reachability post-deploy | Increase in `/app` 404s, failed smoke test `frontend` stage, missing assets in R2 listing | Frontend |
| Secrets/config leakage via logging due to insufficient redaction | Low | High | Audit logging fields, enforce redaction flags, and guard sensitive keys in telemetry payloads | Logs containing tokens/IDs flagged by security scanners | Security |

**Top 3 Burn Down Now**
1. Monitor `ingest.ip_kv_bucket_failed` warnings and wire alerting before raising limits.
2. Automate compare-mode diff assertions in CI to catch telemetry mismatches before deploys.
3. Ship a deployment checklist step verifying shim flag absence in production environments.

Assumptions • Risk appetite accepts Medium likelihood/impact when mitigations in-flight • Ops dashboards surface new log metrics within minutes • Team cadence supports monthly risk review  
Open Questions • Should we formalize RPO/RTO targets for telemetry data? • Who signs off on disabling compare mode post-rollout? • Do we need automated secret scanning on worker logs?  
Risks • Mitigation fatigue if owners are overloaded • Compare-mode left running beyond window • Retention backups skipped during incident response  
Next 3 Actions • Assign engineering owners per mitigation and track in Linear • Add risk review to bi-weekly ops sync agenda • Integrate risk register updates into release checklist
