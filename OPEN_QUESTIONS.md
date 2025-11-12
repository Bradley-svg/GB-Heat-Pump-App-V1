# Open Questions
1. **Exporter -> overseas contract** – Which team owns defining the canonical `didPseudo` batch schema and rolling it out without downtime? Do we need a versioned schema or dual-write period?
2. **Historical data cleanup** – What is the approved plan for purging or re-HMACing existing D1 rows (`devices`, `latest_state`, `ops_metrics`, `telemetry`) that already contain raw `device_id`? Is data loss acceptable or do we need an irreversible hash?
3. **Signature evidence** – Where should `/health` outputs or signature verification logs live so compliance can capture them (ticketing system, log bucket, etc.)?
4. **Guardrail automation** – Should the Mode A checklist be generated automatically (e.g., via a CI job that inspects code/tests) or maintained manually with sign-offs? Who approves status flips?
5. **Dashboard hardening ownership** – Should CSP/Permissions-Policy enforcement live inside the overseas worker (platform team) or in a separate CDN layer managed by frontend?
