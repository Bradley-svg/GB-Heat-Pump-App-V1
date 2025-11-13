# Updated Risk Register (Mode A focus)

| Risk | Likelihood | Impact | Mitigation | Early Warning Signal | Owner |
| --- | --- | --- | --- | --- | --- |
| Overseas API processes raw device identifiers (P0-overseas-raw-ingest) | Low | High | Pseudonymous batch ingest is live; monitor for regressions and ensure D1 stays pseudonymous. | `ingest.batch_failed` spikes or any `/api/ingest` payload containing device identifiers. | Platform API Lead |
| Signature verification missing (P0-export-signature-missing) | Low | High | Ed25519 verification + `EXPORT_VERIFY_PUBKEY` gating shipped; add health alarms for missing/invalid keys. | Verification errors or `/health` lacking signature metadata. | Security Engineering |
| Raw ingest flag misconfiguration (P1-allow-raw-ingest-unguarded) | Low | High | `ALLOW_RAW_INGEST` now fails validation outside localhost; keep shim CI gate and alert if someone adds the secret. | Shim guard workflow failures or env validation errors mentioning `ALLOW_RAW_INGEST`. | Platform API Lead |
| Raw device identifiers logged/metricized overseas (P1-logs-leak-device-id) | Low | High | Ingest logging now omits device IDs; keep log scrubbing rules and monitor for regressions. | Any `logger` entry or ops metric row containing raw device identifiers. | Observability Lead |
| Guardrail documentation out of sync (P1-modea-doc-drift) | Medium | Medium | Generate guard checklists from automated evidence; add doc tests that fail when status mismatches code. | Guard checklist PRs without linked automation, or `modea-guard` job drift. | Compliance Lead |
| SPA served without CSP/Permissions-Policy (P2-dashboard-no-csp) | Medium | Medium | Add Worker middleware enforcing strict CSP + frame-ancestors; lint `index.html` for required meta tags. | Security scanners flag missing headers; browsers load `/app` without CSP response header. | Frontend Lead |

Top risks align with `SECURITY_TRIAGE.md`; owners are accountable for keeping the mitigation rows up to date during the 90-day plan.
