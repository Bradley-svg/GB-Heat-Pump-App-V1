# Open Questions
1. **Evidence pipeline** – Where should Ed25519 verification / batch-ingest health signals be published so Compliance can attach them to Mode A filings (e.g., automated /health snapshots, Datadog monitors, ticket links)?
2. **Guardrail source of truth** – Should the Mode A checklist + PR summary be generated automatically from tests/lints? If so, which team owns the tooling and sign-off workflow?
3. **Dual-control audit trail** – How do we capture two-person approvals for CN mapping-table access in a way that can be queried/exported quarterly?
4. **Fixture hygiene** – What is the preferred approach for providing DEV_ALLOW_USER data (base64 env, hashed IDs, or entirely synthetic) so guard scripts pass while keeping DX reasonable?
5. **Dashboard CSP ownership** – Should CSP/Permissions-Policy headers be enforced at the Cloudflare Worker layer or via an upstream CDN? Who will own the rollout/testing plan?

