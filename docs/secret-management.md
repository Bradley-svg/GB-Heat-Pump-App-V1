# Secret Management Playbook

This document captures where the system's sensitive values live, how to provision them with Wrangler secrets, and the operational runbook for rotating each secret. Use it whenever you add an environment, recover from a credential leak, or onboard new engineers who need to manage sensitive configuration.

## Secrets Inventory

| Secret | Purpose | Notes | Rotation cadence |
| --- | --- | --- | --- |
| `CURSOR_SECRET` | AES-GCM key material used to seal and unseal cursor tokens returned by the API. | Must be at least 16 characters. Rotation invalidates previously issued cursor tokens. | Rotate every 90 days or immediately if leakage is suspected. |
| `ACCESS_AUD` | Cloudflare Access audience tag that the Worker verifies on incoming requests. | Treat as sensitive to avoid leaking internal Access configuration. Rotation requires updating Access policies in Cloudflare. | Review quarterly and rotate when Access policies or applications change. |
| `ACCESS_JWKS_URL` | JWKS endpoint published by Cloudflare Access that contains signing keys for issued JWTs. | Not strictly secret, but keep private to avoid exposing Access topology. Rotate if Access domain or certificate bundle changes. | Review with Access certificate rollovers; rotate at least twice per year. |
| `ASSET_SIGNING_SECRET` | HMAC secret for generating signed URLs to the R2-backed asset worker. | Optional: only required when issuing signed `GET`/`HEAD` URLs. Rotation requires updating any producer of signed URLs. | Rotate every 6 months or when the signing service rotates credentials. |
| `INGEST_ALLOWED_ORIGINS` | Comma or newline-separated list of browser origins that may call `/api/ingest` and `/api/heartbeat`. | Production firmware expects `https://devices.greenbro.io,https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev`. Update immediately if firmware allowlist changes. | Review before each firmware release and at least quarterly. |
| `INGEST_RATE_LIMIT_PER_MIN` | Per-device success-rate throttle for ingest + heartbeat endpoints. | Current firmware transmits at up to 120 requests/minute. Set to `120` unless hardware cadence changes. | Validate monthly against telemetry load; rotate whenever firmware cadence changes. |
| `INGEST_FAILURE_LIMIT_PER_MIN` | Guardrail for repeated auth/validation failures per device. | Defaults to half of the success ceiling (minimum `10`). Set to `0` to disable. Raise only if firmware intentionally retries after validation errors. | Review alongside success limit; adjust when cadence or validation behavior changes. |
| `INGEST_SIGNATURE_TOLERANCE_SECS` | Acceptable clock skew for signed ingest requests. | Default `300` seconds (5 minutes). Tighten or relax in lockstep with firmware timestamp tolerance. | Reconfirm monthly and during any device time-sync firmware update. |

The Worker code reads each secret from the runtime `env` object. No secret values should live in `services/overseas-api/wrangler.toml`, GitHub, or checked-in source files.

### GitHub Actions variables & secrets (Prompt Bible #24 – Performance Test Plan)

`Perf Smoke` (`.github/workflows/perf-smoke.yml`) reads the target Worker URL and optional Access token from GitHub configuration:

| Name | Type | Purpose | Notes |
| --- | --- | --- | --- |
| `PERF_BASE_URL` | Repository variable **or** secret | Base URL for the k6 smoke harness. | Set this to the production Worker origin (for example `https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev`). If unset, the workflow skips automatically. |
| `PERF_ACCESS_JWT` | Repository secret | Optional Cloudflare Access JWT for authenticated smoke runs. | Issue via `cloudflared access login` or Access service token. Omit when targeting a public staging environment. Rotate whenever Access policies change. |
| `CLOUDFLARE_ACCOUNT_ID` | Repository secret | Required by `.github/workflows/kv-fallback-monitor.yml` to tail Workers logs. | Use the same account ID referenced in `services/overseas-api/wrangler.toml`. |
| `CLOUDFLARE_API_TOKEN` | Repository secret | API token with Workers Tail permission so the KV fallback monitor can stream logs. | Scope minimally to `Workers Tail` + `Workers Scripts:Read`; rotate alongside other automation tokens. |
| `CLOUDFLARE_API_TOKEN_D1` | Repository secret | Writable API token used by `worker-ci.yml` to run `wrangler d1 migrations apply` remotely. | Scope to `Workers Scripts:Edit`, `Workers KV Storage:Edit`, and `D1:Edit`. Rotate annually or immediately after incident response. |

Document the last rotation timestamp in the release log and update the values whenever the Worker URL or Access application changes.

## Provisioning With Wrangler

Every deploy runs through a "secrets provisioning" gate:

1. **Prepare local template.** Copy `.dev.vars.example` to `.dev.vars` and replace placeholder values with credentials from the password manager. Wrangler reads `.dev.vars` when running `wrangler dev --local` or tests.
2. **Push required secrets.** For each Cloudflare environment (default plus any `--env <name>` variants), run:

   ```bash
   wrangler secret put CURSOR_SECRET
   wrangler secret put ACCESS_AUD
   wrangler secret put ACCESS_JWKS_URL
   wrangler secret put INGEST_ALLOWED_ORIGINS
   wrangler secret put INGEST_RATE_LIMIT_PER_MIN
   wrangler secret put INGEST_FAILURE_LIMIT_PER_MIN
   wrangler secret put INGEST_SIGNATURE_TOLERANCE_SECS
   # Optional when signed asset URLs are needed:
   wrangler secret put ASSET_SIGNING_SECRET
   ```

   When setting multiple bindings, you can export values and run the helper:

   ```bash
   export ACCESS_AUD=00000000-0000-0000-0000-000000000000
   export ACCESS_JWKS_URL=https://<team>.cloudflareaccess.com/cdn-cgi/access/certs
   export CURSOR_SECRET=generate-a-strong-value-here
   export INGEST_ALLOWED_ORIGINS=https://devices.greenbro.io,https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev
   export INGEST_RATE_LIMIT_PER_MIN=120
   export INGEST_FAILURE_LIMIT_PER_MIN=60  # set to 0 to disable the failure guardrail
   export INGEST_SIGNATURE_TOLERANCE_SECS=300
   # export ASSET_SIGNING_SECRET=only-if-signed-urls-required
   # Optional development flags (local-only; CI now blocks them in shared environments)
   # export ALLOW_DEV_ACCESS_SHIM=true
   # export DEV_ALLOW_USER='{"email":"local-admin@example.com","roles":["admin"],"clientIds":["profile-west"]}'
   node scripts/bind-cloudflare-secrets.mjs --env production
   ```

3. **Capture evidence.** After each provisioning run, execute `wrangler secret list [--env <name>]` and capture the JSON output (screenshot or artifact) in the deployment ticket. This proves the bindings exist and surfaces stale entries for cleanup.

> **Heads-up:** GitHub Actions enforces the shim guard (`pnpm check:prod-shim`) on CI and deploy workflows. Any `ALLOW_DEV_ACCESS_SHIM` or `DEV_ALLOW_USER` binding outside the local environment will block the pipeline, so remove them before rerunning the gate.

Recommendations:

- Store canonical secret values in the team password manager (1Password vault: Platform / Infra) before running `wrangler secret put`.
- The Worker deploys as a single script (`gb-heat-pump-app-v1`), so omit `--env` unless targeting a named environment.
- Track provisioning evidence alongside the change request for future audits.

### Local Development

- Use `.dev.vars.example` as the template for `.dev.vars`. Keep `.dev.vars` personal and never commit it (already ignored via `.gitignore`).
- Populate the ingest secrets locally so `validateEnv` passes and tests exercise the same configuration as production.
- Avoid sharing `.dev.vars` files; each developer should source secrets from the password manager or rotate locally as needed.

### Device Key Hygiene

- Persist only the SHA-256 hash of each device's shared secret in `devices.device_key_hash` (see `seeds/dev/seed.sql` for a reference insert statement). The `0008_device_key_hash_constraint.sql` migration enforces 64-character lowercase hex.
- During firmware pilots we sometimes load placeholder secrets for bench hardware; rotate those with production values before cut-over so rate limiting and signature validation remain reliable.
- When rotating, stage the new hash via `wrangler d1 execute ... UPDATE devices SET device_key_hash=LOWER(HEX(DIGEST('raw-secret','sha256'))) WHERE device_id='<id>';` and update the downstream firmware bundle concurrently.
## Rotation Procedures

Follow the standard five-step rotation checklist for every secret:

1. **Plan** - Raise a ticket with scope, affected services, and target completion date. Confirm who owns the downstream clients that consume the secret.
2. **Prepare** - Generate the new value, store it in the password manager with metadata (creator, timestamp, environment), and update this document if scope changes.
3. **Deploy** - Use `wrangler secret put ... --env <name>` to replace the secret. For multi-region deployments, rotate staging first, then production during a defined change window.
4. **Verify** - Exercise the affected paths (API calls, signed URL flows, Access-gated endpoints). Monitor Worker logs and Cloudflare Access metrics for anomalies.
5. **Clean Up** - Revoke or delete the old credential at the source (Cloudflare Access, signing key store, etc.) and close the rotation ticket with verification evidence.

### Secret-Specific Guidance

- **CURSOR_SECRET**
 - Rotation invalidates previous cursor tokens. Coordinate with client teams to ensure their UIs or jobs can request fresh cursors without disruption.
 - Schedule rotations during low traffic and clear any cached cursors in automation or batch jobs.

- **ACCESS_AUD / ACCESS_JWKS_URL**
 - Generate a new Cloudflare Access application or service token if you need to rotate the audience tag.
 - Update associated Access policies to reference the new audience and confirm that authorized identities propagate.
 - After rotating `ACCESS_JWKS_URL`, purge cached JWKS entries by redeploying the Worker (the JWKS cache is keyed by URL).

- **ASSET_SIGNING_SECRET**
 - Rotate in tandem with whatever service issues signed URLs (e.g., backend admin tools). Deploy the new secret to the signer before flipping the Worker binding to avoid downtime.
 - If dual-running is required, add temporary support for accepting both signatures before fully decommissioning the old secret.

Document every rotation in the ops runbook or incident tracker for future audits.

## Access Controls

- Limit `wrangler secret put` privileges to the Platform / Infra engineering group with Cloudflare account roles that grant **Workers KV:Edit** and **Workers Scripts:Edit** permissions. Avoid broad `Account Admin` rights where possible.
- Require multi-factor authentication on Cloudflare accounts and password manager profiles used to access secrets.
- Enforce change control: rotations should flow through a reviewed pull request (when code changes are required) and a tracked ticket referencing the verification evidence.
- GitHub Actions or CI jobs must never echo secret values. When automation needs access, inject secrets via the Cloudflare API or OIDC-scoped tokens rather than committing values to repository configs.

## Incident Response

If you suspect leakage:

1. Immediately rotate the affected secret(s) following the steps above.
2. Revoke any related credentials at the issuer (e.g., expire old Access tokens, invalidate signed URLs).
3. Review Cloudflare analytics and Worker logs for unauthorized access attempts.
4. File an incident report outlining exposure scope, remediation, and preventative actions.

Keep this playbook up to date as environments or dependencies evolve.




