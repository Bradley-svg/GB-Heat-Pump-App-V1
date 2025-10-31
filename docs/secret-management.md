# Secret Management Playbook

This document captures where the system's sensitive values live, how to provision them with Wrangler secrets, and the operational runbook for rotating each secret. Use it whenever you add an environment, recover from a credential leak, or onboard new engineers who need to manage sensitive configuration.

## Secrets Inventory

| Secret | Purpose | Notes |
| --- | --- | --- |
| `CURSOR_SECRET` | AES-GCM key material used to seal and unseal cursor tokens returned by the API. | Must be at least 16 characters. Rotation invalidates previously issued cursor tokens. |
| `ACCESS_AUD` | Cloudflare Access audience tag that the Worker verifies on incoming requests. | Treat as sensitive to avoid leaking internal Access configuration. Rotation requires updating Access policies in Cloudflare. |
| `ACCESS_JWKS_URL` | JWKS endpoint published by Cloudflare Access that contains signing keys for issued JWTs. | Not strictly secret, but keep private to avoid exposing Access topology. Rotate if Access domain or certificate bundle changes. |
| `ASSET_SIGNING_SECRET` | HMAC secret for generating signed URLs to the R2-backed asset worker. | Optional: only required when issuing signed `GET`/`HEAD` URLs. Rotation requires updating any producer of signed URLs. |

The Worker code reads each secret from the runtime `env` object. No secret values should live in `wrangler.toml`, GitHub, or checked-in source files.

## Provisioning With Wrangler

All environments (production, staging, preview) must receive secrets via Wrangler. The default environment uses the commands below; append `--env <name>` for additional environments.

```bash
wrangler secret put CURSOR_SECRET
wrangler secret put ACCESS_AUD
wrangler secret put ACCESS_JWKS_URL
wrangler secret put ASSET_SIGNING_SECRET    # only if signed R2 URLs are required
```

Recommendations:

1. Store canonical secret values in the team password manager (1Password vault: Platform / Infra) before running `wrangler secret put`.
2. Use the `--env production` flag when targeting the production Worker. For ad-hoc previews, set secrets on the default environment unless your workflow dictates otherwise.
3. Run `wrangler secret list [--env <name>]` after provisioning to confirm bindings exist and remove superseded entries.

### Local Development

- Create a personal `.dev.vars` file (already ignored via `.gitignore`) that mirrors the required bindings:

  ```
  CURSOR_SECRET=local-dev-secret-change-this
  ACCESS_AUD=00000000-0000-0000-0000-000000000000
  ACCESS_JWKS_URL=https://<team>.cloudflareaccess.com/cdn-cgi/access/certs
  ASSET_SIGNING_SECRET=optional-if-testing-signed-urls
  ```

- Avoid sharing `.dev.vars` files; each developer should source secrets from the password manager or rotate locally as needed.

## Rotation Procedures

Follow the standard five-step rotation checklist for every secret:

1. **Plan** – Raise a ticket with scope, affected services, and target completion date. Confirm who owns the downstream clients that consume the secret.
2. **Prepare** – Generate the new value, store it in the password manager with metadata (creator, timestamp, environment), and update this document if scope changes.
3. **Deploy** – Use `wrangler secret put ... --env <name>` to replace the secret. For multi-region deployments, rotate staging first, then production during a defined change window.
4. **Verify** – Exercise the affected paths (API calls, signed URL flows, Access-gated endpoints). Monitor Worker logs and Cloudflare Access metrics for anomalies.
5. **Clean Up** – Revoke or delete the old credential at the source (Cloudflare Access, signing key store, etc.) and close the rotation ticket with verification evidence.

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

