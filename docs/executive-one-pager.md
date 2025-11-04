# GreenBro Fleet Console — Executive One-Pager

## Product Snapshot
- **Mission:** Transform raw controller signals into live fleet visibility, device-level diagnostics, and actionable alerts for decarbonized heat-pump deployments.
- **Experience:** Secure, role-aware single-page app from factory floor to field techs, powered by stable REST contracts.
- **Differentiators:**
  - RBAC-backed route guarding and masked identifiers protect multi-tenant fleets.
  - Cloudflare Access front door with JWT session rotation and signed R2 assets.
  - Alert automation with MTTA/MTTR tracking and commissioning checklists.

## Target Personas & Value
| Role | Core Needs | Platform Delivery |
| --- | --- | --- |
| **Admin / Operations** | Fleet-wide KPIs, alert triage, commissioning oversight, security posture | Full KPI dashboards, unified alert queue, commissioning tools, ops/admin workspaces, CSV export, audit trails |
| **Client Stakeholders** | Visibility into owned sites, trend monitoring, SLA confirmation | Scoped KPIs, device status & history with masked identifiers, read-only diagnostics |
| **Contractors / Field Techs** | Actionable work orders, rapid triage, job-specific context | Assigned device lists, commissioning checklist per job, scoped alerts and diagnostics |

RBAC RouteGuard enforces these personas at the screen and API response level.

## Core Screen Lineup (MVP)
- **Overview:** Fleet KPIs and trends drawn from `/api/fleet/summary`.
- **Devices:** Searchable fleet list via `/api/devices` with role-based scoping.
- **Device Detail:** Live vitals from `/api/devices/:id/latest`, charts for temps and energy.
- **Alerts:** Derived alert queues with per-type filters.
- **Commissioning:** Local, resumable checklist for factory and field activation.
- **Ops (/ops):** Operations-only workspace for internal teams.
- **Admin & Archive (/admin, /admin-archive):** Governance, exports, deep pagination.

## Data & Integrations
- **Telemetry Ingest:** `POST /api/ingest/:profileId` (≤256 KB JSON, ±10 min drift, idempotent).
- **Heartbeat:** `POST /api/heartbeat/:profileId` for liveness.
- **API Stability:** SPA consumes stable contracts (`/api/me`, `/api/fleet/summary`, `/api/devices`, `/api/devices/:id/latest`).
- **Storage:** Cloudflare R2 for assets with signed GET/HEAD, gated PUT/DELETE.

## Security Posture
- Cloudflare Access fronting app & R2; unauthenticated routes redirect/401.
- JWT sessions with rotation; role-scoped API responses and masked IDs.
- Audit logging on sensitive flows; future alert action comments will extend coverage.

## Alert Framework (Default Rules)
- No heartbeat (warn/crit by age).
- Low ΔT while compressor running (< 2°C).
- Low COP (< 2.0 sustained).
- Overheat: outlet temp above threshold for duration.
- Low flow when compressor on.
- Defrost active & sensor faults (dictionary driven).
Each alert auto-notifies, auto-clears, and tracks MTTA/MTTR.

## Status & Roadmap
- **Shipped:** Compact dashboard, Device Detail, Alerts, Commissioning checklist, Admin + Archive, R2 asset pipeline, smoke & security scripts.
- **High-Value Next:**
  1. Batch latest endpoint to eliminate alert N+1 calls.
  2. Historical series endpoint for richer charts.
  3. Server-persisted commissioning runs with PDF exports.
  4. Alert actions API for acknowledge/assign/resolve with comments.

## Operational Readiness
- **Smoke Script:** Covers login, dashboards, alerts, commissioning persistence, admin export, archive pagination.
- **Security Script:** Validates Access guardrails, signed R2 behavior, and role isolation.
- **Accessibility:** WCAG AA palette, focus rings, keyboardable tables, dark-mode charts with minimal gridlines.

## Visual Identity
- **Palette:** `#0a0f0d` backgrounds, `#101716` panels, emerald accents (`#52ff99`), soft glow rings (`#1a3a2d`), warning (`#ffcc66`), error (`#ff7a7a`).
- **Design Language:** Rounded 2xl cards, pill statuses, dotted success animations, clean charts.

