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

### Adding logs in new code

```ts
import { loggerForRequest } from "../utils/logging";

const log = loggerForRequest(req, { route: "/api/widgets/:id", widget_id: widgetId });
log.info("widgets.enrichment_started");
log.error("widgets.enrichment_failed", { error });
```

Logs are persisted through Cloudflare Workers Observability (`wrangler.toml` sets `persist = true`), which means they are queryable in Workers Analytics and available for Logpush export.

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

The JSON payload also surfaces real time indicators:

- `devices.offline_ratio`
- `ops_summary.server_error_rate`, `client_error_rate`, `slow_rate`
- `ops_summary.top_server_error_routes` (top 5 offenders)
- `ops_summary.slow_routes` (routes breaching latency threshold)

These fields are designed to feed dashboards or alerting pipelines without additional joins.

### Sample queries

- Prometheus: `greenbro_ops_server_error_rate > 0.02` (warn), `> 0.05` (critical).
- JSON: `curl https://.../metrics?format=json | jq '.ops_summary.server_error_rate'`.

## Workers Analytics & Logpush integration

1. **Persisted logs**: Wrangler configuration already enables `observability.logs.persist = true`. This streams the JSON payloads into Workers Analytics (available in the Cloudflare dashboard under *Workers > Observability*).
2. **Create or map a dataset** (one-time):
   ```bash
   wrangler analytics engine upload-schema greenbro_logs \
     --column request_id:string \
     --column ts:timestamp \
     --column level:string \
     --column msg:string \
     --column method:string \
     --column path:string \
     --column status:int \
     --column duration_ms:float \
     --column device_id:string \
     --column profile_id:string
   ```
   (Adjust schema if you want to capture additional fields.)
3. **Wire a Logpush job** to ship logs to storage or an external SIEM:
   ```bash
   wrangler observability logpush create \
     --dataset workers_logs \
     --destination-type r2 \
     --bucket-url r2://greenbro-observability/logs/ \
     --frequency 1m
   ```
   Alternative destinations (HTTPS, Google BigQuery, AWS S3, Datadog, Splunk, etc.) are also supported.
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
  3. Confirm the offline cron ran (look for `cron.offline_check.completed` log within the last 5 minutes) and review the `processed` count.
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
  - Temporarily bump the limit (eg. to `180`) via `wrangler secrets put`.
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

## External dashboards

- **Grafana / Prometheus**: Scrape `/metrics`, alert using the thresholds above.
- **Datadog**: Use Logpush HTTPS destination. Map `level` to severity, create monitors on `request.failed`, `heartbeat.rate_limited`, etc.
- **BigQuery / warehouse**: Use Logpush to GCS/S3, load into warehouse for longer retention and ML-based anomaly detection.

## Next steps checklist

- [ ] Configure your alerting platform to use the documented thresholds.
- [ ] Stand up a dashboard that charts offline ratio, server error rate, and ingest rate-limit events.
- [ ] Add runbook links from alert definitions to this document.
