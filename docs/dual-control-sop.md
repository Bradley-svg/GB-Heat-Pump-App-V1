# Mode A Dual-Control SOP – Mapping Table & Re-Identification

**Purpose.** Ensure no single operator can access or re-identify pseudonymized device data. Applies to:
- `services/cn-gateway` Postgres `mapping` table (`device_id_raw`, `did_pseudo`, `key_version`).
- Any tooling/script capable of reversing DID → device_id.

## Roles
| Role | Primary | Backup |
| --- | --- | --- |
| **Requesting Operator (R1)** | CN Ops Engineering Lead | CN Platform Engineer |
| **Approving Operator (R2)** | Compliance Lead | Security Lead |

Both roles must be on different teams and authenticated via bastion MFA.

## Preconditions
1. Change ticket with impact statement, customer/device scope, and retention window.
2. R1 + R2 confirm latest Important-Data checklist is signed.
3. Monitoring alert configured for `audit_log` table to detect access anomalies.

## Execution Steps
1. **R1 prepares read-only SQL file** (no `INSERT/UPDATE/DELETE`). Script must:
   - Filter on explicit profile/device IDs.
   - Emit only the minimum fields required for the incident/case.
2. **R2 reviews** the SQL, confirms scoping + ticket metadata, and signs off in ticket.
3. **R1 runs** the SQL via bastion session using `psql --set ON_ERROR_STOP=1 --file <script>.sql`.
   - Output saved to encrypted temporary file (`.gpg`) with ticket ID in filename.
4. **R1 immediately shares** the GPG-encrypted artifact with R2 (Signal/Teams E2EE).
5. **R2 validates**:
   - Result row count matches expectation.
   - No extra columns included.
   - Data is deleted or stored in ticket vault after use.
6. **Both operators log** the action:
   - R1 attaches command transcript + checksum to ticket.
   - R2 attaches review notes + evidence of secure deletion.

## Emergency Re-ID
If regulators/law enforcement require immediate access:
1. Security Lead pages the dual-control roster.
2. Above process still applies; only retention window may be expanded.
3. Post-incident review within 72h; checklist updated with lessons learned.

## Auditing & Evidence
- `services/cn-gateway/src/db/audit.ts` already records `mapping` access; operators must include ticket ID in `comment` column.
- Monthly audit: Compliance Lead samples ≥2 tickets, verifying dual signatures + matching audit_log rows.
- Store SOP references in `docs/important-data-checklist.md` row for mapping table.

## Rotation & Maintenance
- Revisit role assignments quarterly or when personnel change.
- Keep this SOP in sync with Important-Data checklist revisions.
