# Deployment Runbook

This runbook captures the happy path for rolling out Worker changes, database migrations, and cron trigger updates. Use it alongside `docs/platform-setup-guide.md` and `docs/observability.md` for deeper background.

---

## Environment Reference

| Env (Wrangler `--env`) | Worker script | Primary URL | D1 database (name -> id) | R2 buckets (binding -> name) | Secrets to provision |
|------------------------|---------------|-------------|--------------------------|-----------------------------|----------------------|
| default (remote/dev)   | `gb-heat-pump-app-v1` | `https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev` | `GREENBRO_DB` -> `ee7ad98b-3629-4985-bd7d-a60c401953a7` | `GB_BUCKET`->`greenbro-brand`; `APP_STATIC`->`greenbro-app-static` | `ACCESS_AUD`, `ACCESS_JWKS_URL` (`https://bradleyayliffl.cloudflareaccess.com/cdn-cgi/access/certs`), `CURSOR_SECRET`, `ASSET_SIGNING_SECRET` |
| production             | `gb-heat-pump-app-v1-production` | `https://app.greenbro.co.za` (route; confirm DNS before first deploy) | `GREENBRO_DB` -> `ee7ad98b-3629-4985-bd7d-a60c401953a7` | `GB_BUCKET`->`greenbro-brand`; `APP_STATIC`->`greenbro-app-static` | `ACCESS_AUD`, `ACCESS_JWKS_URL`, `CURSOR_SECRET`, `ASSET_SIGNING_SECRET`, optional `ALLOWED_PREFIXES`, ingestion limits |

> `ACCESS_AUD` values are managed in Cloudflare Access and stored only via `wrangler secret put`. Rotate/update them alongside the Access application policies described in `docs/platform-setup-guide.md`.

---

## 1. Pre-Deployment Checklist

- Confirm the branch is green in **Frontend CI** and **Worker CI**.
- Review pending migrations: `npm run migrate:list`.
- Ensure required secrets are set for the target environment (`wrangler secret put ... --env <env>`).
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
