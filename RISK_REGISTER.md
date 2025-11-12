# Updated Risk Register (Mode A focus)

| Risk | Likelihood | Impact | Mitigation | Early Warning Signal | Owner |
| --- | --- | --- | --- | --- | --- |
| Overseas API processes raw `device_id` (P0-overseas-raw-ingest) | High | Critical | Replace `/api/ingest` with a `didPseudo` batch endpoint, backfill D1 with pseudonymous IDs, and block legacy routes. | Any `/api/ingest` 2xx log containing `device_id`, or D1 rows with non-HMAC identifiers. | Platform API Lead |
| Signature verification missing (P0-export-signature-missing) | Medium | Critical | Ship Ed25519 verification + `/health` drift alert; fail deploys when `EXPORT_VERIFY_PUBKEY` absent. | `/health` lacks `signatureConfigured`, exporter success metrics without matching verify logs. | Security Engineering |
| Raw ingest flag misconfiguration (P1-allow-raw-ingest-unguarded) | Low (post-fix) | High | Keep new env validation + CI shim check, add runtime metric `ingest.raw_enabled` and alert if non-zero outside local/test. | `validateEnv` exceptions or `ingest.raw_enabled{env!="local"}` metric spikes. | Platform API Lead |
| Raw `device_id` logged/metricized overseas (P1-logs-leak-device-id) | High | High | Pseudonymize before logging/metrics, add linters to reject `device_id` fields outside CN. | `logger` output or D1 `ops_metrics.device_id` contains non-HMAC IDs. | Observability Lead |
| Guardrail documentation out of sync (P1-modea-doc-drift) | Medium | Medium | Generate guard checklists from automated evidence; add doc tests that fail when status mismatches code. | Guard checklist PRs without linked automation, or `modea-guard` job drift. | Compliance Lead |
| SPA served without CSP/Permissions-Policy (P2-dashboard-no-csp) | Medium | Medium | Add Worker middleware enforcing strict CSP + frame-ancestors; lint `index.html` for required meta tags. | Security scanners flag missing headers; browsers load `/app` without CSP response header. | Frontend Lead |

Top risks align with `SECURITY_TRIAGE.md`; owners are accountable for keeping the mitigation rows up to date during the 90-day plan.
