# Telemetry Refactor Architecture (Step-by-Step Design)

## Required Capabilities
- Serve `/api/telemetry/latest-batch` and `/api/telemetry/series` with RBAC-scoped results.
- Respect feature modes (`legacy`, `refactor`, `compare`) to derisk rollout.
- Mask sensitive numerical fields and identifiers per role.
- Deliver deterministic ordering, carry-forward behaviour, and pagination-ready metadata.
- Emit structured observability for success/failure, latency, and shadow mismatches.

## Data Model & Key Entities
- **telemetry**: primary time-series table (device_id, ts, metrics JSON, faults, energy readings). Indexed by `(device_id, ts)` for latest lookups and bucket scans.
- **ops_metrics**: stores per-request metrics enabling rate-limit calculations and latency dashboards.
- **device_lookup** materialized via `buildDeviceLookup` for token→device resolution and RBAC scoping.
- **commissioning_runs** (referenced indirectly for capping dataset retention but not mutated by telemetry endpoints).

## Modules & Responsibilities
- `withAccess` guard (`src/router/access.ts`): enforces Cloudflare Access before hitting telemetry routes and caches the authenticated user on the request.
- `routes/telemetry.ts`: top-level handlers, feature-mode orchestration, request validation, response shaping, and legacy comparison.
- `lib/telemetry-access.ts`: RBAC-aware device resolution, SQL fragment generation, carry-forward configuration, and masking helpers.
- `lib/telemetry-store.ts`: D1 query executors for latest batches and series aggregation with typed results.
- `schemas/telemetry.ts`: Zod schemas defining request payloads, query options, and allowed metric sets.
- `telemetry.ts`: shared presentation + masking helpers (`maskTelemetryNumber`, derived metrics).
- Observability utilities (`utils/logging.ts`, `lib/request-metrics.ts`, `lib/ops-metrics.ts`): logging, metrics, and rate-limit tracking.

## Interfaces to External Systems
- **Cloudflare Access**: JWT-based authentication enforced via request headers, now centralized with `withAccess`.
- **Cloudflare D1**: SQL datastore for telemetry + ops tables; queries executed via prepared statements with bound parameters.
- **Cloudflare R2** (indirect): retention job exports telemetry; not directly touched by endpoints but informs data availability.
- **SPA API**: Consumes JSON responses documented in `docs/telemetry-api-design.md`; expects masked IDs and consistent shapes.

## Design Patterns
- **Decorator/Guard**: `withAccess` wraps route handlers to enforce cross-cutting auth concerns.
- **Strategy / Feature Toggle**: `getTelemetryFeatureMode` selects between legacy/refactor/compare strategies at runtime based on environment.
- **Repository**: `telemetry-store` abstracts D1 queries with typed return values.
- **Facade**: `telemetry-access` coordinates scope checking, device resolution, and SQL fragments, hiding underlying RBAC complexities.

## Scale & Operability
- **Observability**: `loggerForRequest` attaches route metadata; shadow mismatches log with structured diffs. Ops metrics capture latency and status for dashboards.
- **Limits**: `resolveCarryForwardLimitMs` caps carry-forward to `TELEMETRY_CARRY_MAX_MINUTES` (default 30). Need guard rails for maximum device tokens (e.g., 200) and time range (e.g., 168h).
- **Resilience**: Compare mode uses `ctx.waitUntil` to avoid blocking responses; legacy fallback ensures service continuity if refactor path throws.
- **Rollout guardrails**: Production stays in `TELEMETRY_REFACTOR_MODE=compare` until the parity review recorded in `docs/deployment-runbook.md` signs off.
- **SLOs**: Target <250 ms P95 for latest batch (50 devices) and <500 ms for 24h series (10 metrics). Track via Ops metrics and Datadog dashboards.
- **Error Handling**: Validation errors return 400 with structured details; unauthorized requests short-circuit at guard; D1 failures propagate 500 with redacted context.

```
+---------+      +-------------+      +------------------+      +----------------+
|  SPA    | ---> | withAccess  | ---> | telemetry routes | ---> | telemetry-store|
| client  |      | guard/cache |      | (latest/series)  |      |   (D1 queries) |
+---------+      +-------------+      +------------------+      +----------------+
                                   \--> telemetry-access (scope & SQL)
                                    \-> legacy handler (compare mode)
                                     \-> logger/ops metrics
```

Assumptions • D1 remains single region with sufficient capacity • SPA can handle new fields (`missingTokens`, `scope`) • Compare mode remains temporary until parity proven  
Open Questions • Do we need percentile aggregates beyond avg/min/max? • Should carry-forward vary per metric? • Is there appetite for edge caching latest batches?  
Risks • Compare-mode log volume during rollout • D1 hot partitions on large fleets • Masking regressions leaking sensitive telemetry  
Next 3 Actions • Define max request envelope (devices, hours, metrics) and enforce in schemas • Benchmark D1 queries with synthetic fleet sizes • Instrument Datadog dashboards for new metrics before rollout

