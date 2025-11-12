# GreenBro Mode A Monorepo

Reference implementation of the Mode A architecture described in the Prompt Bible. The repo contains the CN-resident gateway, overseas Cloudflare Worker, shared SDKs/UI packages, and dashboard/mobile clients that only consume pseudonymized telemetry.

```
pnpm install
pnpm --filter @greenbro/sdk-core test
pnpm --filter @greenbro/cn-gateway dev
```

## Workspace Layout

| Path | Description |
| --- | --- |
| `packages/sdk-core` | SAFE metric schemas, pseudonymization helpers |
| `packages/sdk-web` / `packages/sdk-rn` | Web + RN API clients |
| `packages/ui-*` | Shared tokens + UI primitives |
| `services/cn-gateway` | Fastify ingress deployed in mainland China |
| `services/overseas-api` | Cloudflare Worker for pseudonymized exports |
| `apps/dashboard-web` | Vite SPA for ops dashboards |
| `apps/mobile` | Expo shell for field/mobile ops |
| `docs` | Runbooks, Prompt Bible, ADRs, Mode A guidance |

Shared tooling lives in `shared/configs` (ESLint, Vitest, tsconfig) and the workspace is declared in `pnpm-workspace.yaml`.

## Common Tasks

| Task | Command |
| --- | --- |
| Run SDK tests | `pnpm --filter @greenbro/sdk-core test` |
| Start CN gateway | `pnpm --filter @greenbro/cn-gateway dev` |
| Start dashboard | `pnpm --filter @greenbro/dashboard-web dev` |
| Start overseas worker | `pnpm --filter @greenbro/overseas-api dev` |
| Run lint (all packages) | `pnpm lint` (from package) |

## Documentation

- `docs/mode-a-operational-guidance.md` - full brief covering legal, data inventory, APIs, observability, and SOPs
- `docs/adr/ADR-001-mode-a-shared-sdks.md` - ADR adopting Mode A + shared SDK strategy
- `docs/*` - existing runbooks (retention, observability, prompt bible, etc.)
- `docs/mode-a/audit-2025-11-11` - Mode A audit package (report, guardrail checklist, SBOM, triage log, and supporting data)

Each pull request should confirm:
1. SAFE list / schemas updated together (`packages/sdk-core`)
2. Relevant apps/services bumped + tests run
3. Docs updated (Prompt Bible style - assumptions, trade-offs, next steps)


