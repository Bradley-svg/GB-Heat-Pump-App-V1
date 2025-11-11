# Open Questions

1. Which owners (Ops + Compliance) will sign off the dual-control SOP for the CN mapping table and re-identification workflow?
2. When can we safely switch the Worker telemetry schema to `.strict()` validation without breaking existing devices?
3. Who is scheduling the initial run of `POST /api/admin/client-events/backfill` so legacy plaintext emails are purged before the next deploy?
