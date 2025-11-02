# Deployment Runbook

This runbook captures the happy path for rolling out Worker changes, database migrations, and cron trigger updates. Use it alongside `docs/platform-setup-guide.md` and `docs/observability.md` for deeper background.

---

## Environment Reference

| Env (Wrangler `--env`) | Worker script | Primary URL | D1 database (name -> id) | R2 buckets (binding -> name) | Secrets to provision |
|------------------------|---------------|-------------|--------------------------|-----------------------------|----------------------|
| default (remote/dev)   | `gb-heat-pump-app-v1` | `https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev` | `GREENBRO_DB` -> `ee7ad98b-3629-4985-bd7d-a60c401953a7` | `GB_BUCKET`->`greenbro-brand`; `APP_STATIC`->`greenbro-app-static` | `ACCESS_AUD`, `ACCESS_JWKS_URL` (`https://bradleyayliffl.cloudflareaccess.com/cdn-cgi/access/certs`), `CURSOR_SECRET`, `ASSET_SIGNING_SECRET` |
| production             | `gb-heat-pump-app-v1-production` | `https://app.greenbro.co.za` (route; confirm DNS before first deploy) | `GREENBRO_DB` -> `ee7ad98b-3629-4985-bd7d-a60c401953a7` | `GB_BUCKET`->`greenbro-brand`; `APP_STATIC`->`greenbro-app-static` | `ACCESS_AUD`, `ACCESS_JWKS_URL`, `CURSOR_SECRET`, `ASSET_SIGNING_SECRET`, optional `ALLOWED_PREFIXES`, ingestion limits (`INGEST_ALLOWED_ORIGINS`, `INGEST_RATE_LIMIT_PER_MIN=120`, `INGEST_SIGNATURE_TOLERANCE_SECS=300`) |

> `ACCESS_AUD` values are managed in Cloudflare Access and stored only via `wrangler secret put`. Rotate/update them alongside the Access application policies described in `docs/platform-setup-guide.md`.

---

## 1. Pre-Deployment Checklist

- Confirm the branch is green in **Frontend CI** and **Worker CI**.
- Review pending migrations: `npm run migrate:list`.
- Ensure required secrets are set for the target environment (`wrangler secret put ... --env <env>`).
- Replace any placeholder secrets (e.g. `CURSOR_SECRET`, `ACCESS_AUD`, `ASSET_SIGNING_SECRET`, `INGEST_ALLOWED_ORIGINS`, `INGEST_RATE_LIMIT_PER_MIN`, `INGEST_SIGNATURE_TOLERANCE_SECS`) with strong values stored in the password manager before the first production deploy.
- Verify Cloudflare credentials (`npx wrangler whoami`) and select the right account.

---

## 2. Apply Database Migrations

| Target | Command | Notes |
|--------|---------|-------|
| Local developer SQLite | `npm run migrate:apply:local` | Keeps Miniflare/SQLite copy in sync. |
| Production | `npm run migrate:apply:production` | Run immediately before the production deploy. |

**Verification**
- Check migration status: `npm run migrate:list -- --env <env>`.
- For destructive changes, snapshot important tables beforehand via `wrangler d1 execute ... --file backup.sql`.

**Rollback**
- Re-run the prior schema migration manually (reverse SQL) if needed.
- If the failing migration was appended in the same release, create and apply a rollback migration (`migrations/NNNN_rollback.sql`) and deploy it immediately.

---

## 3. Deploy the Worker

1. Build frontend assets if needed: `npm run frontend:build`.
2. Dry-run the Worker deploy: `npm run build` (writes preview bundle to `dist/`).
3. Deploy:
   - Production: `npm run deploy:production`

> **GitHub Actions**: Trigger the `Worker Deploy` workflow (`.github/workflows/worker-deploy.yml`) for repeatable rollouts. Provide `production` as the environment and let it run migrations plus cron synchronization automatically. Store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets before the first run.

**Verification**
- Inspect the deployment list: `npx wrangler deployments list --env <env>` and note the new `deployment_id`.
- Tail logs for the new version: `npx wrangler tail --env <env> --format jsonl --sampling-rate 1`.
- Hit key routes (`/ingest/*`, `/r2/*`) using Cloudflare Access JWTs to confirm 2xx responses.
- Confirm environment variables: `npx wrangler deployments status --env <env>` (look for expected bindings).

**Rollback**
1. Identify the previous good version: `npx wrangler deployments list --env <env>`.
2. Run `npx wrangler rollback <deployment_id> --env <env>`.
3. If migrations were part of the release, apply the rollback migration noted above.

---

## 4. Cron Trigger Synchronization

Cron schedules in `wrangler.toml` (under `[triggers]`) deploy automatically with the Worker. If you update the cron configuration without shipping code, use the dedicated scripts:

| Target | Command |
|--------|---------|
| Production | `npm run cron:deploy:production` |
| Current environment | `npm run cron:deploy` |

**Verification**
- After a deploy, confirm the cron is registered: `npx wrangler deployments status --env <env>` (look for the `crons` block).
- Watch for the scheduled Worker logs: `npx wrangler tail --env <env> --filter "offline_cron"` and confirm `cron.offline_check.completed` appears within the expected window (see `docs/observability.md` §2).

**Rollback**
- Redeploy with the previous `wrangler.toml` (with the prior cron list) using `npm run deploy:<env>`.
- If only triggers changed, re-run `npm run cron:deploy:<env>` from the previous commit.

---

## 5. Post-Deployment Validation

- **Smoke tests**: `npm run test:smoke`.
- **Security scans**: `npm run test:security`.
- **API spot checks**: Use the HTTP client recipes in `docs/telemetry-api-design.md`.
- **Metrics**: Validate Grafana/Analytics dashboards show traffic for the new version ID.
- **Alerting**: Leave the deploy channel quiet for at least twice the cron interval (10 minutes for the 5-minute offline cron) to ensure no alarms fire.

---

## 6. Incident Handling

- Capture deployment metadata in the ops log (git SHA, deployment ID, migration paths).
- If rollback fails or triggers remain stale, escalate to Cloudflare support with the deployment ID and timestamps.
- File a postmortem summarizing detection, mitigation, and lessons learned.

Keep this runbook with the release engineer rotation to guarantee consistent rollouts.

---

## 7. Observability & Alerts

### Log streaming (Workers → R2)

1. Ensure the analytics bucket exists (one-time): `npx wrangler r2 bucket create greenbro-observability`.
2. Provision an R2 API token with write scope for `greenbro-observability` and export `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
3. Export Cloudflare auth for automation (`CLOUDFLARE_ACCOUNT_ID=0bee3514d14fef8558ccaf0bf2b72eb1`, `CLOUDFLARE_API_TOKEN=<token with Logpush write>`).
4. Run `bash ops/logpush/create-workers-logpush.sh`. This wires the `workers_logs` dataset to `r2://greenbro-observability/workers-logs` with a 60s push interval.
5. Validate: `curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/logpush/jobs"` and confirm the job is `enabled:true`.

> Wrangler OAuth tokens do not currently ship with Logpush scopes; create a scoped API token via the Cloudflare dashboard or Terraform before step 4.

### Analytics datasets

- `workers_logs` schema: `{ request_id:string, ts:timestamp, level:string, msg:string, method:string, path:string, status:int, duration_ms:float, device_id:string, profile_id:string }`.
- If the dataset is not present in Workers Analytics, upload it once with the latest Wrangler (`wrangler analytics engine upload-schema greenbro_logs --column request_id:string ...`). The command is documented in `docs/observability.md`; Cloudflare dashboard offers the same workflow if the CLI flag is unavailable.

### Dashboards

- Grafana: import `ops/grafana/greenbro-workers-observability.json` against the Prometheus data source that scrapes `/metrics`. The panels mirror the offline ratio (warn 20% / crit 35%), 5xx/4xx error rates, ingest 429s (warn 90/min, crit 120/min), and route-level throughput.
- Datadog: apply `ops/datadog/workers-monitors.json` via `datadog monitors create` or Terraform. Monitors cover offline ratio, server error rate, slow rate, and ingest rate-limit spikes. Tag them with `service:gb-workers` for routing.

### Sample queries / checks

- Worker metrics (JSON): `curl -H "cf-access-jwt-assertion:$JWT" https://app.greenbro.co.za/metrics?format=json | jq '.ops_summary.server_error_rate'`.
- Prometheus scrape: `greenbro_ops_server_error_rate > 0.02`, `sum(rate(greenbro_ops_requests_total{route="/api/ingest",status="429"}[5m]))`.
- Log search (R2 export via `aws s3 cp`): `jq 'select(.msg=="request.failed") | {ts, route, status, request_id}' *.json`.
- Quick health tail: `npx wrangler tail --format=json --sampling-rate 1 | jq 'select(.msg=="cron.offline_check.completed")'`.

Link the alert destinations back to this section (runbook URL) so on-call has immediate context when thresholds fire.
