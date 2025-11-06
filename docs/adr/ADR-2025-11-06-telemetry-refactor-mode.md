# ADR-2025-11-06: Telemetry Refactor Feature Modes

- **Date:** 2025-11-06
- **Status:** Proposed
- **Related:** `docs/telemetry-api-design.md`, `docs/telemetry-refactor-architecture.md`

## Context
We are rolling out refactored telemetry endpoints that consolidate device lookups, introduce batch/latest aggregation, and provide bucketed series data. The legacy endpoints are still available and power existing dashboards. We need a safe mechanism to:
- validate parity between refactor and legacy outputs,
- switch environments back to the legacy implementation quickly if regressions emerge, and
- observe discrepancies without blocking responses.

Constraints:
- All requests must remain authenticated via Cloudflare Access.
- Responses must meet current latency and payload guarantees.
- Logging volume must be manageable under production load.

## Options
1. **Single hard cutover to refactor path.**
2. **Environment flag with dual execution (`legacy`, `refactor`, `compare`).**
3. **Parallel deployment (duplicate endpoints) with traffic splitting at the SPA.**

## Decision
Adopt **Option 2**: a feature mode flag (`TELEMETRY_REFACTOR_MODE`) supporting `legacy`, `refactor`, and `compare`.
- Default to `refactor` once parity is proven.
- Use `compare` in staging/production during rollout to shadow legacy responses and log mismatches.
- Retain `legacy` fallback for emergency rollback without redeploying code.

## Consequences
### Positive
- Safe rollout path with minimal SPA change.
- Structured logging for mismatch triage without impacting response latency (`ctx.waitUntil`).
- Enables gradual confidence building before removing legacy code.

### Negative
- Compare mode doubles compute per request and can increase log volume; must monitor and disable after stabilization.
- Additional configuration management (per-environment flag) can drift without documentation.
- Legacy path must be maintained and tested until decommissioned.

Assumptions • Cloudflare Workers headroom can handle compare-mode overhead • Ops dashboards surface mismatch logs rapidly • Feature flag managed via Wrangler deploys  
Open Questions • What threshold of mismatches triggers rollback? • Should compare mode sample instead of 100%? • When do we delete the legacy path?  
Risks • Forgetting to disable compare mode post-rollout • Operator misconfiguring flag across environments • Legacy path diverging after schema changes  
Next 3 Actions • Add CI check ensuring compare mode disabled in production after rollout • Document flag usage in deployment runbook • Schedule deletion of legacy handlers once parity confirmed
