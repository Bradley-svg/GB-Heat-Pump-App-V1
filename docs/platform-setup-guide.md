# Platform Setup Guide

This runbook bridges Cloudflare Access, D1, R2, and Worker configuration so new contributors can provision the full stack end-to-end. Pair it with `docs/secret-management.md` for credential hygiene.

---

## 1. Cloudflare Access Front Door

The Worker trusts Cloudflare Access JWTs via `requireAccessUser` (`src/lib/access.ts`), enforcing `ACCESS_AUD` and keys from `ACCESS_JWKS_URL`.

### 1.1 Create or update the Access application
1. In the Cloudflare dashboard, go to **Zero Trust > Access > Applications**.
2. Create an **Application > Self-hosted** entry (or update the existing one):
   - **Application domain**: `gb-heat-pump-app-v1.<team>.workers.dev` (or your custom domain).
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
- For purely local development (`--local`), you can enable the Access shim by setting `DEV_ALLOW_USER` to a mock Access user. Example session commands:
  - Bash: `export DEV_ALLOW_USER='{"email":"admin@example.com","roles":["admin"],"clientIds":["profile-west"]}' && wrangler dev --local`
  - PowerShell: `$env:DEV_ALLOW_USER='{"email":"admin@example.com","roles":["admin"]}' ; wrangler dev --local`
  The shim only activates when `Cf-Access-Jwt-Assertion` is missing; any supplied JWT is still fully verified.
- If you prefer to exercise the real flow, inject a JWT into `Cf-Access-Jwt-Assertion` manually (generate via `cloudflared access login`), or temporarily stub `requireAccessUser` in tests.
- Ensure secrets exist in the preview environment: `wrangler secret put ACCESS_AUD --env preview`.

### 1.4 Access workflow diagram
```
Browser -> Access login -> Cf-Access-Jwt-Assertion header
      -> Cloudflare edge -> Worker requireAccessUser()
      -> RBAC (src/rbac.ts) -> Route handler or R2 client
```

### 1.5 Troubleshooting
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

Once deployed, reach the R2 router through `/r2/*` (or the path configured in `src/app.ts`).

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
| `INGEST_ALLOWED_ORIGINS`   | CSV of allowed device origins. |
| `INGEST_RATE_LIMIT_PER_MIN`| Rate limiting for ingestion endpoints. |
| `INGEST_SIGNATURE_TOLERANCE_SECS` | Replay protection window for device signatures. |

Set secrets in each environment:
```bash
wrangler secret put ACCESS_AUD
wrangler secret put CURSOR_SECRET
wrangler secret put ASSET_SIGNING_SECRET --env staging
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

- Update Access secrets: `wrangler secret put ACCESS_AUD --env production`.
- Apply D1 migrations: `npm run migrate:apply`.
- Seed local data: `npm run seed:dev`.
- Upload to R2: `curl -X PUT -H "Cf-Access-Jwt-Assertion: <token>" --data-binary @file.png https://<worker>/r2/brand/file.png`.

Keep this guide close when rotating credentials or onboarding teammates to avoid incidental 401s and schema drift.
