| ID | Severity | Owner | 48h Plan | Status |
| --- | --- | --- | --- | --- |
| P0-modea-bypass-overseas-ingest | P0 | Worker Platform + CN Gateway | Freeze any new `/api/ingest` integrations, deploy WAF rule to block raw payloads, and start patch to require pseudonymized batches only. Escalate to program mgmt until merged. | Open |
| P1-access-jwt-weak | P1 | Platform Auth | Ship issuer + clock-tolerance patch for `requireAccessUser`, add tests, and monitor Access audit logs for rejected tokens. Target deploy within 48h. | Open |
| P1-ip-log-nested | P1 | Worker Platform | Remove `client_ip` from nested log fields and backfill redaction test coverage. Roll with next Worker deploy and confirm log sample. | Open |
| P1-overseas-schema-mismatch | P1 | Platform API | Align exporter field names with overseas schema, regenerate SDK types, and verify batch ingest succeeds. Coordinate with CN gateway owners. | Open |
| P1-export-key-unset | P1 | Platform Ops | Generate/upload Ed25519 public key via `wrangler secret` and add deploy checklist item to block missing keys. | Open |
| P1-safe-metrics-drift | P1 | SDK + CN Gateway Leads | Decide whether extra metrics are SAFE; either implement in CN gateway or remove from SDK docs. Document outcome in README. | Open |
| P1-observability-reporter-user | P1 | Worker Platform | Masking patch merged; deploy Worker and confirm log sink shows masked reporter data. | Fixed (pending deploy) |
| P1-client-events-email-plaintext | P1 | Worker Platform / Data Eng | Hashing logic merged; schedule data backfill and deploy Worker. Monitor D1 rows post-backfill. | Fixed (deploy+backfill pending) |
