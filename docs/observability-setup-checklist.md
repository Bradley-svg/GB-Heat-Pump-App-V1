# Observability Setup Checklist

Use this checklist when bringing up a fresh environment or backfilling monitoring for `gb-heat-pump-app-v1`. It assumes the Worker is already deployed with persisted logs (`wrangler.toml` sets `observability.logs.persist = true`).

## 1. Prerequisites

- Confirm you have a Cloudflare API token with Logpush write scope and the account ID (`CLOUDFLARE_ACCOUNT_ID`).
- Ensure the R2 bucket `greenbro-observability` exists:  
  `npx wrangler r2 bucket create greenbro-observability`
- Provision an R2 access key pair with write access and export `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`.
- Install required CLIs: `wrangler`, `jq`, and either `datadog` CLI or Terraform for monitor import. Grafana import can be done via UI or `grafana-toolkit`.

## 2. Logpush pipeline

1. Export credentials in your shell:
   ```bash
   export CLOUDFLARE_ACCOUNT_ID=...
   export CLOUDFLARE_API_TOKEN=...
   export R2_ACCESS_KEY_ID=...
   export R2_SECRET_ACCESS_KEY=...
   ```
2. (Optional, one-time) upload the Analytics Engine schema if the dataset is missing:
   ```bash
   bash ops/analytics/upload-greenbro-logs-schema.sh
   ```
3. Create the Logpush job targeting R2:
   ```bash
   bash ops/logpush/create-workers-logpush.sh
   ```
4. Verify status:
   ```bash
   curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/logpush/jobs" | jq
   ```
   Confirm the `greenbro-observability` job is `enabled: true` and `frequency: "1m"`.

## 3. Dashboards

### Grafana

1. Point Prometheus (or your metrics collector) at the Worker metrics endpoint behind Cloudflare Access. The scrape job should hit `/metrics` using an Access token.
2. Import `ops/grafana/greenbro-workers-observability.json` into Grafana (UI: Dashboards > Import > Upload JSON).
3. Bind the dashboard variable `Prometheus` to the scrape data source.
4. Save the dashboard under the Platform/Workers folder for on-call visibility.

### Alternative tooling

If you rely on a different visualization stack (for example DataDog dashboards), mirror the panels defined in the Grafana JSON: offline ratio, 5xx rate, 4xx rate, slow request rate, ingest 429 count, and top slow/error routes from the JSON metrics payload.

## 4. Alert policies

### Datadog monitors

1. Set `DATADOG_API_KEY` and `DATADOG_APP_KEY` (required by the Datadog CLI).
2. Apply monitors from `ops/datadog/workers-monitors.json` using either:
   ```bash
   datadog monitors create --definition @ops/datadog/workers-monitors.json
   ```
   or via Terraform if the service catalog prefers infrastructure-as-code.
3. Confirm the monitors appear under the `service:gb-workers` tag set and route to the platform on-call schedule.
4. Spot check that the cron gap monitors (`GB Workers :: Offline cron gap`, `GB Workers :: Ingest nonce prune gap`) show a status of OK once the Worker has emitted logs after import.

### Pager routing

- Map critical alerts (offline ratio, server error rate) to paging schedules.
- Route warning thresholds (slow rate, ingest rate limiting) to Slack or lower-severity channels for triage.

## 5. Validation

- Generate sample traffic (hit `/metrics`, replay a few ingest calls) and confirm the Logpush job delivers objects into `r2://greenbro-observability/workers-logs/`.
- Open the Grafana dashboard and verify panels light up with fresh data (may require waiting for the next scrape).
- In Datadog, use the "Test Notifications" feature on each monitor to validate channel wiring.
- Update the runbooks (`docs/deployment-runbook.md`, `docs/observability.md`) with the date of completion and any environment-specific overrides.
- Run the cron gap simulation from `docs/observability.md#cron-gap-runbook` (pause or replay logs) at least once per environment to validate alert firing end-to-end.
