# Platform Setup Guide

This runbook bridges Cloudflare Access, D1, R2, and Worker configuration so new contributors can provision the full stack end-to-end. Pair it with `docs/secret-management.md` for credential hygiene.

---

## 1. Cloudflare Access Front Door

The Worker trusts Cloudflare Access JWTs via `requireAccessUser` (`src/lib/access.ts`), enforcing `ACCESS_AUD` and keys from `ACCESS_JWKS_URL`.

### 1.1 Create or update the Access application
1. In the Cloudflare dashboard, go to **Zero Trust > Access > Applications**.
2. Create an **Application > Self-hosted** entry (or update the existing one):
  - **Application domain**: `gb-heat-pump-app-v1.bradleyayliffl.workers.dev` (match the Worker route in `wrangler.toml`).
   - **Session duration**: `>=24h` (Worker rotates sessions via Access).
   - **Allowed IdPs**: include Okta, Google, or other IdPs used by the ops teams.
3. Save the application, then capture:
   - **AUD tag** -> copy into `ACCESS_AUD`.
   - **JWKS endpoint** -> `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs` for `ACCESS_JWKS_URL`.
4. Define policies per role (admin, contractor, client). Tie group membership to the RBAC derivation rules in `src/rbac.ts`.

### 1.2 Service tokens (optional but recommended)
If you need non-interactive automation (for example CI seeding R2), mint a **Service Token** and let the client send `Cf-Access-Client-Id` and `Cf-Access-Client-Secret`. The Worker already checks headers via `requireAccess`.

### 1.3 Local development tips
- `wrangler dev --remote` runs the Worker on Cloudflare, so Access policies apply naturally.
- For purely local development use the dedicated configuration: `wrangler dev --local --env local`. The `env.local` block in `wrangler.toml` now sets `APP_BASE_URL=http://127.0.0.1:8787/app`, points API calls at the local worker, and enables the Access shim. `validateEnv` will refuse to start if `ALLOW_DEV_ACCESS_SHIM` is truthy while `APP_BASE_URL` is not a localhost origin.
  - Bash: `export DEV_ALLOW_USER='{"email":"admin@example.com","roles":["admin"],"clientIds":["profile-west"]}' && wrangler dev --local --env local`
  - PowerShell: `$env:DEV_ALLOW_USER='{"email":"admin@example.com","roles":["admin"]}' ; wrangler dev --local --env local`
  (The shim auto-enables via `env.local`; override `APP_BASE_URL`/`APP_API_BASE` manually if you need a different loopback host.)
  The shim only activates when `Cf-Access-Jwt-Assertion` is missing; any supplied JWT is still fully verified.
- Production deploys include a GitHub Actions guard (`npm run check:prod-shim`) that halts the workflow if `ALLOW_DEV_ACCESS_SHIM` is still bound in the target environment. Remove or rotate the secret before re-running the deployment.
- If you prefer to exercise the real flow, inject a JWT into `Cf-Access-Jwt-Assertion` manually (generate via `cloudflared access login`), or temporarily stub `requireAccessUser` in tests.
- Ensure secrets exist for the Worker: `wrangler secret put ACCESS_AUD`.

### 1.4 Enforce policies on `gb-heat-pump-app-v1.bradleyayliffl.workers.dev`

1. In the Access application you created above, add policies for each role the Worker expects:
   - **Admin**: grant to platform/ops groups that administer devices (maps to `roles:["admin"]`).
   - **Contractor**: grant limited access for installers or field technicians (`roles:["contractor"]`).
   - **Client**: grant read-only visibility to customer-facing operators (`roles:["client"]`).
2. For each policy, confirm the **Include** rules reference the right identity providers or service tokens.
3. Set the **Application domain** to `https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev/*`.
4. After saving the policies, copy the updated **AUD** value if Cloudflare assigned a new tag and store it in the password manager. You will reuse it in the next section when binding Worker secrets.

> Tip: enforce a default-deny policy after enumerating the allow rules so unlisted users receive an explicit deny instead of falling through.

### 1.5 Bind Access and ingest secrets to the Worker

Run the following once to populate the Worker secrets. Paste values from the password manager so they survive future rotations.

```bash
wrangler secret put ACCESS_AUD
wrangler secret put ACCESS_JWKS_URL
wrangler secret put CURSOR_SECRET
wrangler secret put INGEST_ALLOWED_ORIGINS           # e.g. https://devices.greenbro.io,https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev
wrangler secret put INGEST_RATE_LIMIT_PER_MIN        # firmware cap (120 today)
wrangler secret put INGEST_FAILURE_LIMIT_PER_MIN     # auth/validation failure guardrail (default 60)
wrangler secret put INGEST_SIGNATURE_TOLERANCE_SECS  # default 300
wrangler secret put ASSET_SIGNING_SECRET             # optional unless issuing signed URLs
```

To push them all in one go, export the values in your shell and run `node scripts/bind-cloudflare-secrets.mjs --env <name>`; the helper pipes each value into `wrangler secret put` and validates numeric fields before handing them to Wrangler.

After provisioning, run a `wrangler deploy --dry-run` to confirm every binding exists without publishing a new version:

```bash
wrangler deploy --dry-run
```

If validation fails, rerun the `wrangler secret put ...` commands above until the Worker starts cleanly.

### 1.6 Access workflow diagram
```
Browser -> Access login -> Cf-Access-Jwt-Assertion header
      -> Cloudflare edge -> Worker requireAccessUser()
      -> RBAC (src/rbac.ts) -> Route handler or R2 client
```

### 1.7 Troubleshooting
- **401 Unauthorized**: Confirm the request includes `Cf-Access-Jwt-Assertion` and the decoded JWT `aud` matches `ACCESS_AUD`.
- **JWT signature errors**: Ensure `ACCESS_JWKS_URL` matches your team domain exactly (no trailing slash). Flush the JWKS cache by redeploying if keys rotate.
- **Role mismatches**: Inspect the role mapping in `src/rbac.ts:11`. Update Access policies to emit the expected group claims.

---

## 2. D1 Database Management

The Worker binds D1 as `env.DB` (see `wrangler.toml`). SQL files live under `migrations/` with ascending numeric prefixes.

### 2.1 Creating migrations
1. Copy the prior migration as a template (`migrations/0003_operational_entities.sql` is a good example).
2. Name new files `NNNN_description.sql` to preserve ordering.
3. Keep schema helpers (indexes, triggers) in `schema-indexes.sql` to support bootstrap for fresh databases.

### 2.2 Applying migrations
Use Wrangler scripts (see `package.json`):
```bash
npm run migrate:list      # show applied vs pending migrations
npm run migrate:apply     # applies pending migrations to the remote alias
```
The scripts reference the Cloudflare database name `GREENBRO_DB`. If your account uses a different name, adjust the scripts and verify with `wrangler d1 list`.

For local SQLite shadow databases (Miniflare):
```bash
wrangler d1 migrations apply GREENBRO_DB --local
```
where `GREENBRO_DB` matches the binding in `wrangler.toml`.

### 2.3 Migration workflow diagram
```
Write SQL -> npm run migrate:list (CI or local sanity)
       -> Pull request review -> wrangler d1 migrations apply <env>
       -> Run smoke tests and seed data
```

### 2.4 Troubleshooting
- **`no such table` at runtime**: the migration was not applied to that environment. Re-run `wrangler d1 migrations apply <env>`.
- **`SQLite busy`**: wait or close other clients (Miniflare, local tests) before applying.
- **Drift between environments**: include `schema-indexes.sql` changes in each migration or backfill with a catch-up migration.

---

## 3. Seed Data

Seed fixtures live in `seeds/dev/seed.sql` and assume the schema from `migrations/`.

> Device rows must store the SHA-256 hash of each shared secret (`devices.device_key_hash`). The `0008_device_key_hash_constraint.sql` migration enforces 64-character lowercase hex values—mirror the pattern in `seeds/dev/seed.sql` when onboarding or rotating hardware credentials.

### 3.1 Run the seed locally
```bash
npm run seed:dev         # executes against the local D1 or Miniflare alias
```
- Ensure the local Miniflare database is initialized (`wrangler d1 migrations apply ... --local`) before seeding.
- Update `seed.sql` when migrations add required columns. Keep destructive operations (DELETE or INSERT) idempotent to allow repeated runs.

### 3.2 Remote seeding
- Prefer running seeds via CI/CD or manual `wrangler d1 execute` with the `--file` flag.
- For production, fork the seed into a new script to avoid loading dev-only fixtures.

### 3.3 Troubleshooting
- **Foreign key failures**: ensure parent tables are created and seeded first; wrap dependent inserts in transactions.
- **Duplicate key errors**: use `INSERT OR REPLACE` for dev data or clear tables at the top of the seed script.

---

## 4. R2 Buckets

Two buckets are declared in `wrangler.toml`:

| Binding      | Bucket name           | Use case                             |
|--------------|-----------------------|--------------------------------------|
| `GB_BUCKET`  | `greenbro-brand`      | Admin-uploaded marketing assets      |
| `APP_STATIC` | `greenbro-app-static` | Static frontend artifacts (optional) |

### 4.1 Provision buckets
```bash
wrangler r2 bucket create greenbro-brand
wrangler r2 bucket create greenbro-app-static
```
If you need per-environment buckets, specify `preview_bucket_name` or create `<bucket>-dev`.

### 4.2 Bind buckets
The bindings in `wrangler.toml` apply globally. For environment overrides:
```toml
[env.staging]
[[env.staging.r2_buckets]]
binding = "GB_BUCKET"
bucket_name = "greenbro-brand-staging"
```

### 4.3 Worker-side enforcement
`src/r2.ts` checks:
- Access JWT via `ACCESS_AUD` and `ACCESS_JWKS_URL`.
- Optional signed URL via `ASSET_SIGNING_SECRET`.
- Key allow list from `ALLOWED_PREFIXES`.

Once deployed, the worker (`https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev`) also fronts the R2 API at `https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev/r2/*` (adjust `src/app.ts` if you need a different prefix).

### 4.4 R2 workflow diagram
```
Client PUT or GET -> Worker /r2 route
               -> Access JWT verification
               -> (optional) Signed URL check
               -> env.GB_BUCKET (Cloudflare R2)
```

### 4.5 Troubleshooting
- **403 `Key not allowed`**: update `ALLOWED_PREFIXES` secret (comma separated list such as `brand/,reports/`).
- **401 on signed GET**: confirm `ASSET_SIGNING_SECRET` matches the HMAC issuer and `exp` is in the future.
- **Slow uploads**: R2 uploads are streamed; large objects benefit from `Content-Type` and `cache-control` metadata to avoid extra HEAD calls.

---

## 5. Environment Configuration

Central configuration lives in `wrangler.toml`. Secrets are injected per environment with `wrangler secret put`.

### 5.1 Baseline variables (`[vars]`)
| Key                        | Source or notes |
|---------------------------|-----------------|
| `APP_BASE_URL`            | Worker URL (update per environment). |
| `RETURN_DEFAULT`          | Fallback redirect target. |
| `TIMEZONE`                | Default timezone for scheduling (`Africa/Johannesburg`). |
| `HEARTBEAT_INTERVAL_SECS` | Used by cron to mark devices offline. |
| `OFFLINE_MULTIPLIER`      | Offline threshold multiplier. |

Override these with `[env.<name>.vars]` when staging or production diverge.

### 5.2 Secrets (set via `wrangler secret put`)
| Secret                     | Purpose |
|----------------------------|---------|
| `ACCESS_AUD`               | Access AUD tag (per app and environment). |
| `ACCESS_JWKS_URL`          | JWKS endpoint (team specific). |
| `CURSOR_SECRET`            | AES key for pagination cursors. |
| `ASSET_SIGNING_SECRET`     | Enables signed R2 reads (only if using signed URLs). |
| `ALLOWED_PREFIXES`         | Optional allow list for R2 keys (for example `brand/,reports/`). |
| `INGEST_ALLOWED_ORIGINS`   | **Required** allowlist of device origins; Worker returns 403 if unset (comma or newline separated). Production firmware expects `https://devices.greenbro.io,https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev`. |
| `INGEST_RATE_LIMIT_PER_MIN`| Rate limiting for ingestion endpoints. Production cadence requires `120` to avoid false positives. |
| `INGEST_FAILURE_LIMIT_PER_MIN` | Failure-rate guardrail; throttle repeated auth/validation errors (default `60`). |
| `INGEST_SIGNATURE_TOLERANCE_SECS` | Replay protection window for device signatures. Set to `300` seconds unless firmware clock drift changes. |

> Non-local development (remote dev, staging, production) must set `INGEST_ALLOWED_ORIGINS`. For purely local `wrangler dev --local` sessions you can omit it, but ingest requests from browsers will be refused until the allowlist is populated.

Set secrets in each environment:
```bash
wrangler secret put ACCESS_AUD
wrangler secret put CURSOR_SECRET
wrangler secret put ASSET_SIGNING_SECRET --env staging
wrangler secret put INGEST_ALLOWED_ORIGINS
wrangler secret put INGEST_RATE_LIMIT_PER_MIN
wrangler secret put INGEST_FAILURE_LIMIT_PER_MIN
wrangler secret put INGEST_SIGNATURE_TOLERANCE_SECS
```

### 5.3 Running locally
1. Install dependencies: `npm install`.
2. Apply migrations locally: `wrangler d1 migrations apply GREENBRO_DB --local`.
3. Load dev seed: `npm run seed:dev`.
4. Start the Worker: `npm run dev` (remote) or `wrangler dev --local` after exporting secrets via `wrangler secret put --env local`.
5. Start the frontend: `npm run frontend:dev`.

### 5.4 CI and CD considerations
- `npm run build` performs a dry-run deploy to `dist/` for inspection.
- Ensure GitHub Actions (if enabled) have Access service tokens stored as repository secrets when invoking R2 endpoints.
- Cron triggers (`*/5 * * * *`) run automatically after deploy (no extra setup).

### 5.5 Environment drift checklist
- Compare `wrangler d1 migrations list` across environments.
- Verify `wrangler r2 bucket list` includes expected staging and production buckets.
- Confirm Access policies reference the same `AUD` value configured on the Worker.

---

## 6. Quick Reference

- Update Access secrets: `wrangler secret put ACCESS_AUD`.
- Apply D1 migrations: `npm run migrate:apply`.
- Seed local data: `npm run seed:dev`.
- Upload to R2: `curl -X PUT -H "Cf-Access-Jwt-Assertion: <token>" --data-binary @file.png https://<worker>/r2/brand/file.png`.

Keep this guide close when rotating credentials or onboarding teammates to avoid incidental 401s and schema drift.
