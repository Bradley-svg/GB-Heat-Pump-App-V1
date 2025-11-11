| ID | Severity | Owner | 48h Plan | Status |
| --- | --- | --- | --- | --- |
| P0-modea-bypass-overseas-ingest | P0 | Worker Platform + CN Gateway | Keep `ALLOW_RAW_INGEST` unset, alert on any 2xx raw-ingest responses, and push factories to use the signed batch path exclusively. | Mitigated |
| P1-access-jwt-weak | P1 | Platform Auth | Harden `requireAccessUser` with issuer + clock tolerance and monitor Access audit logs for spikes. | Fixed |
| P1-ip-log-nested | P1 | Worker Platform | Ship logging redaction change and verify log sinks contain only aggregate counters. | Fixed |
| P1-overseas-schema-mismatch | P1 | Platform API | Deploy the `didPseudo` rename across exporter + overseas API; run contract tests before enabling exports. | Fixed |
| P1-export-key-unset | P1 | Platform Ops | Store the Ed25519 public key via `wrangler secret put EXPORT_VERIFY_PUBKEY` and watch `/health` for `signatureConfigured: true`. | Mitigated |
| P1-safe-metrics-drift | P1 | SDK + CN Gateway Leads | Decide whether extra metrics are SAFE; either implement in CN gateway or remove from SDK docs. Document outcome in README. | Open |
| P1-observability-reporter-user | P1 | Worker Platform | Masking patch merged; deploy Worker and confirm log sink shows masked reporter data. | Fixed (pending deploy) |
| P1-client-events-email-plaintext | P1 | Worker Platform / Data Eng | Hashing logic merged; schedule data backfill and deploy Worker. Monitor D1 rows post-backfill. | Fixed (deploy+backfill pending) |
