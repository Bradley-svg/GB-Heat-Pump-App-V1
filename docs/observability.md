# Observability & Operations

This worker now emits structured JSON logs and richer metrics so that the platform team can monitor production state, drive alerts, and respond quickly when something drifts. This note captures the logging contract, alert thresholds, integration patterns, and playbooks for the most common incidents.

## JSON logging standard

Every request handled by the worker is logged with a JSON payload that includes a durable `request_id`, route, device metadata (when available), and timing information. Example:

```json
{
  "ts": "2025-10-31T15:55:12.183Z",
  "level": "info",
  "msg": "request.completed",
  "request_id": "6f0e5df1ec5b0f7d",
  "method": "POST",
  "path": "/api/ingest/profile-123",
  "host": "gb-heat-pump-app-v1.workers.dev",
  "status": 200,
  "duration_ms": 182,
  "device_id": "HP-882233",
  "profile_id": "profile-123",
  "cf_ray": "8f0ce755bc3e1abc"
}
```

### Implementation highlights

- `router.ts` binds a request logger that automatically emits `request.received`, `request.completed`, and `request.failed` events with latency in milliseconds.
- Route handlers use `loggerForRequest(req)` and `logger.with({ ... })` to append context (`device_id`, `profile_id`, tenant, etc.).
- Long running jobs (for example the offline cron) log via `systemLogger({ task: "..." })`.
- Errors always appear with a normalized `{ name, message, stack }` envelope so downstream processors can parse them safely.
- Offline cron logs now include `batches`, `processed`, and `truncated`; retention cron logs include `telemetry_has_more`. Add alerts on `truncated=true` or `telemetry_has_more=true` if these appear in production logs.

### Adding logs in new code

```ts
import { loggerForRequest } from "../utils/logging";

const log = loggerForRequest(req, { route: "/api/widgets/:id", widget_id: widgetId });
log.info("widgets.enrichment_started");
log.error("widgets.enrichment_failed", { error });
```

Logs are persisted through Cloudflare Workers Observability (`wrangler.toml` sets `persist = true`), which means they are queryable in Workers Analytics and available for Logpush export. For the environment bootstrap steps that turn on Logpush, dashboards, and alert policies, follow `docs/observability-setup-checklist.md`.

## Metrics and alert thresholds

`GET /metrics?format=json` returns a JSON document that now bundles device counts, ops breakdowns, summary indicators, and the canonical `ALERT_THRESHOLDS` used by automation. `GET /metrics` continues to expose Prometheus format.

Current thresholds baked into `src/telemetry/index.ts`:

| Metric | Warn | Critical | Notes |
| --- | --- | --- | --- |
| Devices offline ratio | 0.20 | 0.35 | Portion of fleet marked offline. |
| Heartbeat gap (minutes) | 5 | 10 | Time window without a heartbeat before alerting. |
| 5xx error rate | 0.02 | 0.05 | Share of API requests returning a server error. |
| 4xx error rate | 0.08 | 0.15 | Indicates possible client misuse or auth issues. |
| Avg req duration (ms) | 1500 | 3000 | Based on `ops_metrics.duration_ms` average per route. |
| Ingest rate limit breaches per device (per min) | 90 | 120 | Uses worker-side throttling config. |
| Consecutive ingest failures | 3 | 5 | Consecutive DB/validation failures by device. |
| Ops metrics insert failures per min | 3 | 6 | Derived from log-based metric; indicates D1 writes rejecting ops metrics. |

In addition, scheduled jobs emit synthetic ops metrics:

- `/cron/retention` records a single entry per run with status `299` when the job exits early and needs to resume later.
- `/cron/offline` records status `299` when the offline sweep truncates due to batch limits. Alert if either route reports status `299` more than once for the same minute.

The JSON payload also surfaces real time indicators:

- `devices.offline_ratio`
- `ops_summary.server_error_rate`, `client_error_rate`, `slow_rate`
- `ops_summary.top_server_error_routes` (top 5 offenders)
- `ops_summary.slow_routes` (routes breaching latency threshold)

> **Alerting (Prompt Bible #6 — Risk Register):** For a zero-cost option, the repo includes `.github/workflows/kv-fallback-monitor.yml`, which runs `scripts/check-ingest-kv-fallback.sh` on a 30-minute schedule. Populate `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` repository secrets and the job will fail (and notify) whenever `ingest.ip_kv_bucket_failed` appears in recent logs. If you later adopt Datadog/Grafana, mirror the same condition (count > 0/5 min) tagged `service:gb-workers`.

These fields are designed to feed dashboards or alerting pipelines without additional joins.

### Sample queries

- Prometheus: `greenbro_ops_server_error_rate > 0.02` (warn), `> 0.05` (critical).
- JSON: `curl https://.../metrics?format=json | jq '.ops_summary.server_error_rate'`.
- Cron state: `wrangler tail --format=json --sampling-rate 1 | jq 'select(.msg=="cron.offline_check.completed") | .truncated'` to watch for truncated batches; similarly, `jq '.telemetry_has_more'` on `cron.retention.completed`.

## Workers Analytics & Logpush integration

1. **Persisted logs**: Wrangler configuration already enables `observability.logs.persist = true`. This streams the JSON payloads into Workers Analytics (available in the Cloudflare dashboard under *Workers > Observability*).
2. **Create or map a dataset** (one-time): `bash ops/analytics/upload-greenbro-logs-schema.sh`. Pass a custom dataset name as the first argument if you do not want to use the default `greenbro_logs`. The script shells out to `wrangler analytics engine upload-schema` with the JSON log columns documented below. Re-run it whenever you add fields to the structured log payload.
3. **Wire a Logpush job** to ship logs to storage or an external SIEM: `bash ops/logpush/create-workers-logpush.sh`. Export the Cloudflare account + API token variables and the destination R2 credentials before running. The script targets the `workers_logs` dataset with a 60s batch interval. Alternative destinations (HTTPS, Google BigQuery, AWS S3, Datadog, Splunk, etc.) are also supported; adjust the script payload if needed.
4. **Dashboards**: Once Logpush is enabled, point your analytics stack at the JSON payload. Fields are consistent across events, making it easy to build Grafana or DataDog dashboards (eg. `avg(duration_ms)` by `route`, `count` by `device_id`).

### Quick analytics checks

- `wrangler tail` now prints JSON. Pipe to `jq`:
  ```bash
  wrangler tail | jq '. | select(.level == "error")'
  ```
- Workers Analytics query (in dashboard):
  ```sql
  SELECT msg, count(*) AS events
  FROM workers_logs
  WHERE ts > DATE_SUB(NOW(), INTERVAL 1 HOUR)
  GROUP BY msg
  ORDER BY events DESC;
  ```

## Operational playbooks

### 1. Devices offline ratio crosses warn/critical

- **Detection**: `devices.offline_ratio` in `/metrics?format=json` exceeds `0.20` (warn) or `0.35` (critical). Prometheus alert uses `greenbro_devices_offline_ratio`.
- **Immediate checks**:
  1. Inspect `ops_summary.top_server_error_routes` for spikes in `/api/heartbeat`.
  2. Query logs for `heartbeat.rate_limited` or `ingest.db_error` events.
  3. Confirm the offline cron ran (look for `cron.offline_check.completed` log within the last 5 minutes), review the `processed` count, and ensure the entry reports `"truncated": false`.
- **Response**:
  - If heartbeats are rate limited, review `INGEST_RATE_LIMIT_PER_MIN` in Workers KV/config and device firmware sending cadence.
  - If DB writes are failing (`ingest.db_error`), run `wrangler d1 execute` with a read-only check on `latest_state` to verify connectivity.
  - Coordinate with field team if the issue is localized to a specific profile/site using `device_id` + `profile_id` fields in logs.
- **Recovery validation**: offline ratio returns below warn threshold and latest cron log shows zero stale devices.

### 2. Server error rate > 2%

- **Detection**: `ops_summary.server_error_rate` or `greenbro_ops_server_error_rate` above `0.02` for 5 minutes.
- **Immediate checks**:
  1. Inspect `ops_summary.top_server_error_routes` to isolate the offending endpoint.
  2. Pull the last 50 matching logs: `wrangler tail --format=json | jq 'select(.msg=="request.failed" and .route=="/api/ingest/:profile")'`.
  3. Verify downstream dependencies (D1, R2) via Cloudflare status dashboard.
- **Response**:
  - Roll back the last deploy if errors align with a release.
  - If D1 failures, consider applying retries in specific handler while hotfixing root cause.
  - Engage vendor if R2/DB outage.
- **Recovery validation**: error rate trending under warn threshold for 15 minutes.

### 3. Heartbeat rate limit alert

- **Detection**: `heartbeat.rate_limited` log events spike or `ops_metrics` records `429` for `/api/heartbeat`.
- **Immediate checks**:
  1. Confirm firmware version or orchestrator change that altered heartbeat frequency.
  2. Validate `INGEST_RATE_LIMIT_PER_MIN` (default `120`). Adjust via Wrangler variable if valid traffic increased.
- **Response**:
  - Temporarily bump the limit (eg. to `180`) via `wrangler secret put`.
  - Communicate with device team to fix the flood and restore standard limit.
- **Recovery validation**: no new `429` records for heartbeat route and rate limit logs quiet.

### 4. Ingest DB error burst

- **Detection**: `ingest.db_error` logs present or `/metrics` `ops_summary.top_server_error_routes` flag `/api/ingest`.
- **Immediate checks**:
  1. Inspect recent D1 status; run a quick read query via Wrangler.
  2. Confirm schema migrations matched deployed code (run `wrangler d1 migrations list`).
- **Response**:
  - If D1 is throttled, scale insert batches (code already handles; consider tuning offline cron chunk size).
  - Capture failing payloads via logs (request_id) for replay after fix.
- **Recovery validation**: `ingest.telemetry_stored` logs resume and server error rate drops.

### 5. Cron gap runbook {#cron-gap-runbook}

- **Detection**: Datadog monitors `GB Workers :: Offline cron gap` and `GB Workers :: Ingest nonce prune gap` fire when no `cron.offline_check.*` or `cron.ingest_nonce_prune.*` log appears for more than 10 minutes (2x the 5-minute schedule). Both queries aggregate `greenbro.logs.count` with `rollup(count, 600)` so a single completion, noop, or failure log keeps them green.
- **Immediate checks**:
  1. Open Cloudflare Workers -> Scheduled Triggers for the production worker to confirm the `*/5 * * * *` cron is still enabled and observe the last run timestamp.
  2. Tail logs locally: `npx wrangler tail --format=json --sampling-rate 1 | jq 'select(.msg|test(\"cron.(offline_check|ingest_nonce_prune)\"))'` to review the last emission or confirm the gap.
  3. If a recent deploy touched `src/app.ts` cron logic or `wrangler.toml` triggers, roll back or redeploy using the previous build.
  4. For `cron.ingest_nonce_prune.failed`, check D1 status (`wrangler d1 execute <DB> --command "SELECT COUNT(*) FROM ingest_nonces"`) and Cloudflare health advisories.
- **Response**:
  - Re-enable the cron via Cloudflare UI if it was paused, then redeploy with `wrangler deploy --env production` to ensure configuration sync.
  - Investigate Cloudflare queue delays or account-level errors; engage support if scheduled events are globally lagging.
  - When failures stem from D1, consider temporarily increasing nonce TTL to avoid blocking ingestion until pruning resumes.
- **Testing**:
  - **Pause test**: In staging, comment out the `*/5 * * * *` entry in `wrangler.toml`, deploy, and wait 12 minutes. The gap monitors should enter `Alert` and post to the routing channel. Revert the cron entry and deploy again to clear.
  - **Replay test**: Use `npx wrangler tail --format=json --sampling-rate 1 > cron-gap.log` during a healthy window, then replay with `cat cron-gap.log | datadog logs send --service gb-workers --source workers` to confirm the monitor clears after synthetic events.
- **Recovery validation**: `cron.offline_check.completed` or `.noop` and `cron.ingest_nonce_prune.completed` logs reappear within the next window; Datadog monitors exit alert; device offline ratios remain stable.

### 6. Ops metrics insert failure runbook {#ops-metrics-insert-failure-runbook}

- **Detection**: Datadog monitor `GB Workers :: Ops metrics insert failure` watches `ops_metrics.insert_failed` logs via `greenbro.logs.count.rollup(count, 60)` and fires when the minute-averaged count exceeds 3 (warn) or 6 (critical) for five minutes.
- **Immediate checks**:
  1. Verify Cloudflare D1 status and quota (`https://www.cloudflarestatus.com/` and Workers dashboard).
  2. Run a read-only probe: `wrangler d1 execute GREENBRO_DB --command "SELECT COUNT(*) FROM ops_metrics;"` to confirm the database responds.
  3. Tail recent failures for context: `npx wrangler tail --format=json | jq 'select(.msg=="ops_metrics.insert_failed")'`.
  4. If only a specific route/device is impacted, inspect the associated deploy changes or ingest payloads.
- **Response**:
  - If D1 is degraded, pause noisy automation that depends on `ops_metrics` (dashboards still work, but counts lag) and open a Cloudflare support ticket.
  - When errors follow a deploy, roll back the worker and re-run `wrangler deploy --env production` once the fix is ready.
  - For sustained spikes on a single device/route, temporarily disable that traffic (Access block or firmware toggle) while the DB issue is resolved.
- **Recovery validation**:
  - `ops_metrics.insert_failed` logs drop back below 1/min for 10 consecutive minutes.
  - Datadog monitor returns to `OK` and the `/metrics` endpoint shows fresh ops window data.
  - Optional spot check: `wrangler analytics engine query greenbro_logs --sql "SELECT bucket_minute, SUM(count) AS failures FROM greenbro_logs WHERE msg = 'ops_metrics.insert_failed' AND bucket_minute >= DATEADD('minute', -60, NOW()) GROUP BY bucket_minute ORDER BY bucket_minute DESC;"` confirms counts are zeroing out.

## External dashboards

- **Grafana / Prometheus**: Scrape `/metrics`, alert using the thresholds above.
- **Datadog**: Use Logpush HTTPS destination. Map `level` to severity, create monitors on `request.failed`, `heartbeat.rate_limited`, etc.
- **BigQuery / warehouse**: Use Logpush to GCS/S3, load into warehouse for longer retention and ML-based anomaly detection.




### Field reference & payload schema

| Field | Type | Notes |
| --- | --- | --- |
| `device_id` | `string | null` | Optional device binding. Admins may enter raw device IDs. |
| `direction` | `"ingress" | "egress"` | Ingress routes inbound commands; egress publishes telemetry. |
| `qos` | `0 | 1 | 2` | Defaults to `0`. |
| `transform` | `object | null` | JSON object applied by the worker before publishing. Must be valid JSON. |
| `description` | `string | null` | Free-form operator note (<= 512 chars). |

**Create example**

```json
{
  "topic": "greenbro/profile-west/commands/fanout",
  "profile_id": "profile-west",
  "direction": "ingress",
  "qos": 1,
  "enabled": true,
  "transform": { "mode": "eco" },
  "description": "Fan out profile-wide efficiency command"
}
```

**Update example**

```json
{
  "description": "Disable while commissioning new firmware",
  "enabled": false
}
```

### Operator workflow & safety checklist


## Next steps checklist

- [ ] Configure your alerting platform to use the documented thresholds.
- [ ] Stand up a dashboard that charts offline ratio, server error rate, and ingest rate-limit events.
- [ ] Add runbook links from alert definitions to this document.
