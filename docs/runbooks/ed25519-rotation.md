# Ed25519 Export Key Rotation Runbook

Purpose: keep the CN gateway signing key and the overseas Worker verification key in sync. Applies whenever CN gateway rotates its Ed25519 signing key or annually (whichever comes first).

## Roles
| Task | Owner |
| --- | --- |
| Generate new CN signing key | Ops Engineering Lead |
| Approve + record rotation | Compliance Lead |
| Update overseas verify key (Wrangler secret) | Platform API Lead |
| Verify `/api/ingest` health after rotation | SRE On-Call |

## Schedule
- Minimum cadence: 12 months.
- Also rotate immediately after any suspected key compromise or HSM maintenance event.
- Track upcoming rotations in the quarterly compliance calendar.

## Steps
1. **Prep ticket** with scope, target environments, and planned date.
2. **CN gateway** generates new key pair inside the HSM (follow vendor-specific process). Record `keyVersion`.
3. **Export public key** only. Share with Platform API Lead via encrypted channel (e.g., AGE or GPG).
4. **Update Wrangler secret**:
   ```bash
   wrangler secret put EXPORT_VERIFY_PUBKEY --env production
   # paste base64 public key
   wrangler secret put EXPORT_VERIFY_PUBKEY --env staging
   ```
5. **Deploy CN gateway** config referencing new `KMS_KEY_VERSION`.
6. **Update overseas Worker** (deploy if code/config changed).
7. **Validate**:
   - `wrangler tail` shows `cron.client_events_backfill`? (not relevant) skip? hmm
   - `curl https://<worker-domain>/health` and ensure `signatureConfigured: true`.
   - Attempt batch ingest from staging exporter; expect HTTP 202.
8. **Document** in ticket with:
   - Secret version IDs / timestamp.
   - `/health` output screenshot.
   - Signatures from Ops + Compliance.
9. **Archive old key material** per HSM policy; destroy previous private key after rollover, except when regulators require retention.

## Alerts & Monitoring
- Cloudflare Worker health check alarms must watch `signatureConfigured`.
- Exporter metrics `exporterBatches{status="failed"}` should stay below baseline; spikes trigger pager to review rotation steps.
