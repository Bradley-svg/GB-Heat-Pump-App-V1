# GreenBro Dashboard Web

React 19 + Vite + TypeScript single-page application for the GreenBro heat pump dashboards. The Worker serves compiled assets from R2 (`app/` prefix) and falls back to the embedded bundle located at `services/overseas-api/src/frontend/static-bundle.ts` for local development.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Cloudflare Wrangler CLI (logged into the same account as the Worker)

A single `pnpm install` at the repository root installs every workspace (apps, services, packages). No nested `npm install` commands are required.

```bash
pnpm install              # run once at repo root
pnpm --filter @greenbro/dashboard-web dev
```

## Local development

- `pnpm --filter @greenbro/dashboard-web dev` – start the Vite dev server on port 5173.
- `pnpm --filter @greenbro/dashboard-web run preview` – serve the production build locally.
- `pnpm dev:worker` (repo root) – launch the Worker alongside the SPA for an end-to-end loop.

The Worker injects `window.__APP_CONFIG__` via a hashed inline script. To test overrides, adjust the Cloudflare environment variables in `services/overseas-api/wrangler.toml` or provide context overrides in `AppProviders` when writing tests.

## Quality gates

- `pnpm --filter @greenbro/dashboard-web run lint` – ESLint with project rules.
- `pnpm --filter @greenbro/dashboard-web run test` – Vitest unit/integration suite.
- `pnpm --filter @greenbro/dashboard-web run test:a11y` – axe-core accessibility checks.
- `pnpm --filter @greenbro/dashboard-web run test:coverage` – coverage report (V8 backend).

CI should execute lint, unit tests (with coverage), and accessibility tests before shipping.

## Build + static bundle

- `pnpm --filter @greenbro/dashboard-web run build` – executes the TypeScript project references and `vite build`, writing output to `apps/dashboard-web/dist`. The `postbuild` hook refreshes `services/overseas-api/src/frontend/static-bundle.ts` so the Worker always has a fallback copy of the SPA.

The build emits:

- `apps/dashboard-web/dist/index.html`
- Hashed assets under `apps/dashboard-web/dist/assets/`

These files are the source of truth for the `APP_STATIC` R2 bucket.

## Automated R2 publishing

Use the root scripts to push the SPA bundle to R2. The helper now reads the manifest from `apps/dashboard-web/dist` and uploads assets under the `app/` prefix.

```bash
pnpm publish:r2                # upload index.html + every file in dist/assets
pnpm publish:r2 -- --dry-run   # print the wrangler commands without executing
```

Behaviour:

- HTML is uploaded with `cache-control: no-store`.
- Assets receive `cache-control: public, max-age=31536000, immutable`.
- Objects are written to `app/index.html` and `app/assets/*` in the `APP_STATIC` bucket declared in `services/overseas-api/wrangler.toml`.

Set `WRANGLER_BIN` if Wrangler is not on `PATH`.

## Registry notes

Corporate environments can still use `scripts/install-frontend.mjs` to seed a temporary `.npmrc` for the app if needed. Export the `NPM_REGISTRY_*` variables described in `docs/npm-registry.md` before running the script.

Please update this README whenever build/test workflows or asset publishing behaviour changes.
