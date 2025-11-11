# Important-Data Handling Checklist — Mode A (v2025-11-11)

| Asset / Dataset | Residency | Owners (Dual-Control) | Storage & Access Controls | Rotation / Review Cadence | Verification Steps |
| --- | --- | --- | --- | --- | --- |
| Device → DID mapping table (`services/cn-gateway` Postgres `mapping`) | Mainland China DC (VPC subnet `cn-gateway`) | Ops Engineering Lead + Compliance Lead | Postgres behind mTLS; access via bastion + short-lived IAM tokens; read-only replicas blocked | Quarterly review of access lists; purge inactive mappings > 18 months | Run `SELECT COUNT(*) ...` diff + audit logs; confirm dual approvals logged in `audit_log` |
| KMS keys for pseudonymization (Alibaba/Tencent/Huawei HMAC keys) | Mainland China KMS | Ops Engineering Lead + Security Lead | Cloud-provider KMS with key policies requiring two approvers; no export | Rotate every 12 months or on incident; document version in `KMS_KEY_VERSION` | Record rotation in `/admin/rotate-key`, capture logs + ticket ID |
| Device shared-secret hashes (`devices.device_key_hash`) | Mainland China D1/Postgres | Device Platform PM + Security Lead | Hash-only storage; updates via `wrangler d1 execute` scripts restricted to allowlist | Rotate per factory firmware release or compromise; review monthly for NULL/weak values | Run `tests/security/worker.security.test.ts` in CI + SQL spot checks |
| Batch export Ed25519 private key (CN gateway) | CN secure HSM | Ops Engineering Lead + Legal Rep | Stored in encrypted file system with hardware-backed key; referenced by path in env | Rotate annually; destroy old key after overseas verification | Maintain capture of new public key in `services/overseas-api/wrangler.toml` + ticket approval |
| Cloudflare Access secrets (`ACCESS_JWKS_URL`, `ACCESS_AUD`) | Cloudflare Access (global) | Platform Engineering Lead + Security Lead | Managed via `wrangler secret`; Access config locked via Okta SSO + change tickets | Review scopes quarterly; rotate audience if Access app cloned | Run `node scripts/ensure-prod-shim-disabled.mjs --env production` + Access audit export |
| Cursor sealing secret (`CURSOR_SECRET`) | Workers D1 secret storage | Platform Engineering Lead + Compliance Lead | `wrangler secret` with restricted binding; not logged | Rotate every 12 months; update `.dev.vars` sample when format changes | Run cursor unit tests + verify tail logs for `cursor.rotate` entry |
| Client Event token secret (`CLIENT_EVENT_TOKEN_SECRET`) | Workers secret | Platform Engineering + App PM | `wrangler secret` in production only; stored separately for staging | Rotate every 6 months; purge cached grants in `client_events` | Run `src/lib/auth/__tests__/telemetry-token.test.ts` and confirm Access logs |

## Operational Checklist
1. **Change Tickets** — Every access or rotation must reference a Jira ticket with both approving owners.
2. **Audit Logs** — Verify `services/cn-gateway` `audit_log` has entries for each mapping export, key rotation, or admin action within 24h.
3. **Incident Response** — In the event of suspected leakage, freeze overseas exports (`EXPORT_ENABLED=false`), rotate pseudonymization keys, and reissue Access secrets within 48h.
4. **Documentation Hooks** — Link this file from `docs/deployment-runbook.md` and the compliance confluence page.
5. **Quarterly Review** — Compliance Lead schedules a quarterly review, signs off via PR to this file summarizing any ownership or cadence changes.
