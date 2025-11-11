| ID | Severity | Owner | 48h Plan | Status |
| --- | --- | --- | --- | --- |
| P0-modea-bypass-overseas-ingest | P0 | Worker Platform + CN Gateway | Keep `ALLOW_RAW_INGEST` unset, alert on any 2xx raw-ingest responses, and push factories to use the signed batch path exclusively. | Mitigated |
| P1-access-jwt-weak | P1 | Platform Auth | Harden `requireAccessUser` with issuer + clock tolerance and monitor Access audit logs for spikes. | Fixed |
| P1-ip-log-nested | P1 | Worker Platform | Ship logging redaction change and verify log sinks contain only aggregate counters. | Fixed |
| P1-overseas-schema-mismatch | P1 | Platform API | Deploy the `didPseudo` rename across exporter + overseas API; run contract tests before enabling exports. | Fixed |
| P1-verify-key-rotation | P1 | Platform API Lead | Tie Wrangler `EXPORT_VERIFY_PUBKEY` updates to every CN signer rotation (minimum annually); capture ticket + `/health` screenshots. | Mitigated (cadence assigned) |
| P1-safe-metrics-drift | P1 | SDK + CN Gateway Leads | SAFE list now matches CN gateway; guard via lint/tests and reject PRs re-adding removed metrics. | Fixed |
| P1-observability-reporter-user | P1 | Worker Platform | Masking patch merged; deploy Worker and confirm log sink shows masked reporter data. | Fixed (pending deploy) |
| P1-client-events-email-plaintext | P1 | Worker Platform / Data Eng | Hashing logic merged; schedule data backfill and deploy Worker. Monitor D1 rows post-backfill. | Fixed (deploy+backfill pending) |
