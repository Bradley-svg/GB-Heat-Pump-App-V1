# Deployment Runbook

This runbook captures the happy path for rolling out Worker changes, database migrations, and cron trigger updates. Use it alongside `docs/platform-setup-guide.md` and `docs/observability.md` for deeper background.

---

## Environment Reference

The platform now deploys a single Worker (`gb-heat-pump-app-v1`). Key bindings and endpoints:

| Worker script | Primary URLs | D1 database (name -> id) | R2 buckets (binding -> name) | Secrets to provision |
|---------------|--------------|--------------------------|------------------------------|----------------------|
| `gb-heat-pump-app-v1` | `https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev` | `GREENBRO_DB` -> `ee7ad98b-3629-4985-bd7d-a60c401953a7` | `GB_BUCKET`->`greenbro-brand`; `APP_STATIC`->`greenbro-app-static` | `ACCESS_AUD`, `ACCESS_JWKS_URL` (`https://bradleyayliffl.cloudflareaccess.com/cdn-cgi/access/certs`), `CURSOR_SECRET`, `ASSET_SIGNING_SECRET`, optional `ALLOWED_PREFIXES`, ingestion limits (`INGEST_ALLOWED_ORIGINS`, `INGEST_RATE_LIMIT_PER_MIN=120`, `INGEST_SIGNATURE_TOLERANCE_SECS=300`, `INGEST_IP_LIMIT_PER_MIN`, `INGEST_IP_BLOCK_SECONDS`), telemetry auth (`CLIENT_EVENT_LIMIT_PER_MIN`, `CLIENT_EVENT_BLOCK_SECONDS`); see `docs/node-red-bridge.md` when deploying the MQTT → HTTPS bridge. |

> When `INGEST_IP_LIMIT_PER_MIN` is greater than zero, bind `INGEST_IP_BUCKETS` (KV) in the target environment. The Worker now fails validation instead of silently falling back to per-isolate token buckets. Use the namespace created via `wrangler kv namespace create greenbro-ingest-ip` (preview + production IDs) for all deployments.

> `AUTH_IP_BUCKETS` (single binding in `wrangler.toml`) should point at the `greenbro-auth-ip` namespace you provisioned via `wrangler kv namespace create ...`. The IDs live in the password manager; update them in one place (global binding) rather than duplicating under `[env.production]`.

> `CLIENT_EVENT_IP_BUCKETS` is now a first-class binding used to throttle `/api/observability/client-events`. Provision preview + production namespaces via `wrangler kv namespace create greenbro-client-event-ip` (add `--env production` for prod) and keep the IDs recorded in the secret-management entry. The worker refuses to deploy if `CLIENT_EVENT_LIMIT_PER_MIN > 0` without this binding, preventing client-event spikes from taking down login endpoints.

### Telemetry token issuance

Mobile clients now call `POST /api/auth/telemetry-token` to refresh their short-lived telemetry JWTs using the existing session. During deployments:

1. Run `wrangler deploy` (preview) and hit `/api/auth/telemetry-token` through the staging Access app to confirm it returns `{ telemetry: { token, expiresAt } }` for an authenticated operator. _(The endpoint intentionally rejects unauthenticated curl calls.)_
2. Once preview is green, run `wrangler deploy --env production`.
3. After rollout, watch `telemetry.event_failed.http` logs and the `signup_flow.resend` dashboards for the first hour; a spike in 401s usually means telemetry tokens are not being refreshed correctly.

> `ACCESS_AUD` values are managed in Cloudflare Access and stored only via `wrangler secret put`. Rotate/update them alongside the Access application policies described in `docs/platform-setup-guide.md`.

### Password reset webhook + auth KV bindings

| Item | Notes |
| --- | --- |
| `PASSWORD_RESET_WEBHOOK_URL` | HTTPS endpoint (SendGrid, SES, Twilio, etc.) that delivers password-reset notifications. Configure via `wrangler secret put PASSWORD_RESET_WEBHOOK_URL` per environment. |
| `PASSWORD_RESET_WEBHOOK_SECRET` | Shared secret used for `Authorization: Bearer …` and `X-Reset-Signature` headers. Must be ≥16 chars. Rotate quarterly via the checklist below. |
| `AUTH_IP_BUCKETS` (KV) | Now provisioned for **both** production and preview. Use `wrangler kv namespace create greenbro-auth-ip --env production` (and `--env preview`) and copy the IDs into `wrangler.toml`. The Worker refuses to boot if `AUTH_IP_LIMIT_PER_MIN > 0` without this binding, preventing silent degradation. |

**Secret rotation checklist**

1. Create a new webhook secret in the password manager.
2. `wrangler secret put PASSWORD_RESET_WEBHOOK_SECRET` for preview, deploy, and verify reset emails hit the sandbox inbox.
3. Repeat for production. Do not delete the previous secret from the service provider until both environments return 2xx responses for test resets.
4. Update the rotation log in the password manager entry with timestamp + operator.

**Monitoring**

- `password_reset.webhook_failed` (Workers log) feeds the Datadog monitor `greenbro.password_reset.notifications`. Alerts page ops if we see >2 failures in 5 minutes.
- Configure the downstream email/SMS provider (SendGrid Event Webhook, SES SNS topic, etc.) to alert on sustained bounce/deferral rates.
- See `docs/password-reset-webhook.md` for payload schema, sample curl verification, and SendGrid wiring steps.

---

### Fleet cache controls

The Worker now caches the expensive fleet dashboards (`/api/client/compact`, `/api/archive/offline`) in `caches.default`. Adjust the following environment variables when deploying:

| Env var | Default | Purpose |
|---------|---------|---------|
| `CLIENT_COMPACT_CACHE_TTL_SECS` | `45` | TTL (seconds) for cached `/api/client/compact` responses per tenant/admin scope. Increase for calmer dashboards, decrease when freshness is critical. |
| `ARCHIVE_CACHE_TTL_SECS` | `60` | TTL (seconds) for cached `/api/archive/offline` snapshots. |
| `CLIENT_QUERY_PROFILE` | `false` | When set to `true`, logs query durations ≥ threshold to help tune indexes/TTL. |
| `CLIENT_QUERY_PROFILE_THRESHOLD_MS` | `50` | Millisecond threshold used when profiling is enabled. |

Alert lifecycle/comment mutations automatically bump the cache token for the affected profile and the global admin scope. Subsequent reads re-compute cache keys and fetch fresh data without relying on TTL expiry. When adding new mutation surfaces (e.g., device state transitions), hook them into the same helper (`invalidateClientDashboardCache`) so dashboards stay consistent.

Successful ingest and heartbeat requests now invalidate the same cache scopes (admin + device profile) so fleet/offline dashboards reflect the latest device state immediately after telemetry flows.

Caching is scope-aware (admin vs tenant) and automatically invalidated on deployment while the version constants (`CLIENT_COMPACT_CACHE_VERSION`, `ARCHIVE_CACHE_VERSION`) remain stable. For emergency purges without redeploying:

1. Temporarily set the relevant TTL env var to `0` (or a single-digit value) and redeploy the Worker; caches will expire almost immediately.
2. Alternatively, bump the version constant in code and redeploy to force a cache miss. Track the change in release notes.

> **Future hook:** when we introduce real-time alert/device mutations, wire those code paths to call `caches.default.delete()` for the scoped keys. Until then rely on short TTLs + redeploy/bump on schema changes.

---

## 1. Pre-Deployment Checklist

- Confirm the branch is green in **Frontend CI** and **Worker CI**.
- Review pending migrations: `npm run migrate:list`.
- Ensure required secrets are set on the Worker (`wrangler secret put ...`).
- Replace any placeholder secrets (e.g. `CURSOR_SECRET`, `ACCESS_AUD`, `ASSET_SIGNING_SECRET`, `INGEST_ALLOWED_ORIGINS`, `INGEST_RATE_LIMIT_PER_MIN`, `INGEST_SIGNATURE_TOLERANCE_SECS`, `INGEST_IP_LIMIT_PER_MIN`, `INGEST_IP_BLOCK_SECONDS`) with strong values stored in the password manager before the first production deploy.
- Verify Cloudflare credentials (`npx wrangler whoami`) and select the right account.
- Verify retention archive readiness: confirm R2 buckets (`npx wrangler r2 bucket list | rg telemetry-archive`), check the `RETENTION_ARCHIVE` binding in `wrangler.toml`, and run `npx vitest run src/jobs/__tests__/retention.test.ts --reporter verbose` to ensure backups log before deletions.
- Confirm telemetry rollout mode: production deployments must keep `TELEMETRY_REFACTOR_MODE=compare` until the parity review sign-off is captured (see _Telemetry parity review_).
- Bootstrap SPA assets: `npm run ops:r2:bootstrap -- --env production` (or run `npm run frontend:build && npm run publish:r2 -- --env production`). The helper writes `dist/app-static-manifest.json`; attach it to the release ticket.
- Confirm the SPA bucket is populated: `npx wrangler r2 object list APP_STATIC/app --limit 5 --env production`. Investigate if the list is empty before shipping.

---

## 2. Apply Database Migrations

| Target | Command | Notes |
|--------|---------|-------|
| Local developer SQLite | `npm run migrate:apply:local` | Keeps Miniflare/SQLite copy in sync. |
| Cloudflare Worker (`gb-heat-pump-app-v1`) | `npm run migrate:apply` | Run immediately before deploying. |

> **Release guard:** When `migrations/0010_ops_metrics_device_route_index.sql` is pending, do not disable the "Apply D1 migrations" option in the `Worker Deploy` GitHub Action. The ingest and heartbeat rate-limit now rely on the covering index `ix_ops_metrics_device_route_ts`, so run migrations before shifting traffic.

**Verification**
- Check migration status: `npm run migrate:list`.
- For destructive changes, snapshot important tables beforehand via `wrangler d1 execute ... --file backup.sql`.

**Rollback**
- Re-run the prior schema migration manually (reverse SQL) if needed.
- If the failing migration was appended in the same release, create and apply a rollback migration (`migrations/NNNN_rollback.sql`) and deploy it immediately.

---

## 3. Deploy the Worker

1. Build and upload SPA assets: `npm run frontend:build && npm run publish:r2 -- --env production`. This updates the `APP_STATIC` bucket and refreshes `dist/app-static-manifest.json` for the release artifact.
2. Dry-run the Worker deploy: `npm run build` (writes preview bundle to `dist/`).
3. Deploy: `npm run deploy`

> **GitHub Actions**: Trigger the `Worker Deploy` workflow (`.github/workflows/worker-deploy.yml`) for repeatable rollouts. The job now builds the frontend, publishes R2 assets (`npm run publish:r2 -- --env production`), and uploads `dist/app-static-manifest.json` as an artifact alongside the Worker bundle. It still targets `gb-heat-pump-app-v1` automatically and runs migrations plus cron synchronization when the inputs are enabled. Store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets before the first run. Worker CI also requires `CLOUDFLARE_API_TOKEN_D1` (token scoped to `Workers Scripts:Edit`, `Workers KV Storage:Edit`, and `D1:Edit`) so remote migrations can run every PR. A nightly `SPA Asset Sync` workflow (`.github/workflows/spa-asset-sync.yml`) keeps `APP_STATIC` aligned with the latest build; monitor its runs for upload failures.

### Access shim guard

Before deploying (locally or through CI), run `npm run check:prod-shim`. The job now executes automatically in every PR, CI, and deploy workflow. If it fails:

1. Remove `ALLOW_DEV_ACCESS_SHIM` and `DEV_ALLOW_USER` from the target Worker:  
   - default env: `npx wrangler secret delete ALLOW_DEV_ACCESS_SHIM` and `npx wrangler secret delete DEV_ALLOW_USER`  
   - explicit env: `npx wrangler secret delete ALLOW_DEV_ACCESS_SHIM --env production`
2. Unset any pipeline variables or repository/environment secrets named `ALLOW_DEV_ACCESS_SHIM` or `DEV_ALLOW_USER` in GitHub Actions (or the triggering platform).
3. Confirm `wrangler.toml` only declares the shim entries under `[env.local.vars]` and remove them from other sections if present.
4. Re-run `npm run check:prod-shim` to verify the guard passes before retrying the deploy.

**Verification**
- Inspect the deployment list: `npx wrangler deployments list` and note the new `deployment_id`.
- Tail logs for the new version: `npx wrangler tail --format jsonl --sampling-rate 1`.
- Hit key routes (`/ingest/*`, `/r2/*`) using Cloudflare Access JWTs to confirm 2xx responses.
- Confirm environment variables: `npx wrangler deployments status` (look for expected bindings).

**Rollback**
1. Identify the previous good version: `npx wrangler deployments list`.
2. Run `npx wrangler rollback <deployment_id>`.
3. If migrations were part of the release, apply the rollback migration noted above.

---

## 4. Cron Trigger Synchronization

Cron schedules in `wrangler.toml` (under `[triggers]`) deploy automatically with the Worker. If you update the cron configuration without shipping code, use the dedicated scripts:

| Target | Command |
|--------|---------|
| Cloudflare Worker (`gb-heat-pump-app-v1`) | `npm run cron:deploy` |

**Verification**
- After a deploy, confirm the cron is registered: `npx wrangler deployments status` (look for the `crons` block).
- Watch for the scheduled Worker logs: `npx wrangler tail --filter "offline_cron"` and confirm `cron.offline_check.completed` appears within the expected window (see `docs/observability.md` section 2) with `"truncated": false` to indicate the batch completed.

**Rollback**
- Redeploy with the previous `wrangler.toml` (with the prior cron list) using `npm run deploy`.
- If only triggers changed, re-run `npm run cron:deploy` from the previous commit.

---

## 5. Post-Deployment Validation

- **Smoke tests**: `npm run test:smoke`.
- **Security scans**: `npm run test:security`.
- **API spot checks**: Use the HTTP client recipes in `docs/telemetry-api-design.md`.
- **Telemetry parity review**: Export `telemetry.refactor.shadow_mismatch` counters from Datadog within one business day, document the comparison in the release ticket, and only flip `TELEMETRY_REFACTOR_MODE` to `refactor` once the review is signed off.
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

### Log streaming (Workers -> R2)

1. Ensure the analytics bucket exists (one-time): `npx wrangler r2 bucket create greenbro-observability`.
2. Provision an R2 API token with write scope for `greenbro-observability` and export `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
3. Export Cloudflare auth for automation (`CLOUDFLARE_ACCOUNT_ID=0bee3514d14fef8558ccaf0bf2b72eb1`, `CLOUDFLARE_API_TOKEN=<token with Logpush write>`).
4. Run `bash ops/logpush/create-workers-logpush.sh`. This wires the `workers_logs` dataset to `r2://greenbro-observability/workers-logs` with a 60s push interval. Refer to `docs/observability-setup-checklist.md` for the full configuration workflow.
5. Validate: `curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/logpush/jobs"` and confirm the job is `enabled:true`.

> Wrangler OAuth tokens do not currently ship with Logpush scopes; create a scoped API token via the Cloudflare dashboard or Terraform before step 4.

### Analytics datasets

- Initialize or update the Workers Analytics Engine dataset with `bash ops/analytics/upload-greenbro-logs-schema.sh [dataset_name]`. Omit the argument to use the default `greenbro_logs` dataset referenced in `docs/observability.md`.
- `workers_logs` schema: `{ request_id:string, ts:timestamp, level:string, msg:string, method:string, path:string, status:int, duration_ms:float, device_id:string, profile_id:string }`.
- If you cannot run the helper script (for example inside an automation target that lacks Bash), run `wrangler analytics engine upload-schema greenbro_logs --column request_id:string ...` manually. The extended command is documented in `docs/observability.md`; the Cloudflare dashboard offers the same workflow if the CLI flag is unavailable.

### Dashboards

- Grafana: import `ops/grafana/greenbro-workers-observability.json` against the Prometheus data source that scrapes `/metrics`. The panels mirror the offline ratio (warn 20% / crit 35%), 5xx/4xx error rates, ingest 429s (warn 90/min, crit 120/min), and route-level throughput.
- Datadog: apply `ops/datadog/workers-monitors.json` via `datadog monitors create` or Terraform. Monitors cover offline ratio, server + client error rates, slow rate, and ingest rate-limit spikes. Tag them with `service:gb-workers` for routing.

### Sample queries / checks

- Worker metrics (JSON): `curl -H "cf-access-jwt-assertion:$JWT" https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev/metrics?format=json | jq '.ops_summary.server_error_rate'`.
- Prometheus scrape: `greenbro_ops_server_error_rate > 0.02`, `sum(rate(greenbro_ops_requests_total{route="/api/ingest",status="429"}[5m]))`.
- Log search (R2 export via `aws s3 cp`): `jq 'select(.msg=="request.failed") | {ts, route, status, request_id}' *.json`.
- Quick health tail: `npx wrangler tail --format=json --sampling-rate 1 | jq 'select(.msg=="cron.offline_check.completed")'`.

Link the alert destinations back to this section (runbook URL) so on-call has immediate context when thresholds fire.

