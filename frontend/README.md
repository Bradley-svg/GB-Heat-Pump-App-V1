# GreenBro Frontend Dashboard

React 19 + Vite + TypeScript single-page application for the GreenBro heat pump dashboard. The worker serves compiled assets from R2 (keys under `app/`) and falls back to the embedded bundle generated in `src/frontend/static-bundle.ts` for local development.

## Prerequisites

- Node.js 20+
- npm (bundled with Node)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) authenticated against the target account

Install dependencies at the repository root (Worker) and inside `frontend/` for the SPA:

```bash
npm install
npm --prefix frontend install
```

## Local development

- `npm run frontend:dev` - start the Vite dev server (port 5173). Pair with `npm run dev` in another terminal to proxy Worker routes.
- `npm run frontend:watch` - Vite dev server bound to `0.0.0.0` for tunnelling or device testing.
- `npm run frontend:preview` - preview the production build locally.

The Worker injects `window.__APP_CONFIG__` via a hashed inline script. When testing custom configs, update the environment variables in `wrangler.toml` or use the `AppProviders` context overrides in tests.

## Quality gates

- `npm run frontend:lint` - ESLint with the project ruleset.
- `npm run frontend:test` - Vitest unit/integration suite (includes the new `DeviceDetailPage` and `useCurrentUser` coverage).
- `npm run frontend:test:a11y` - axe-core accessibility checks.
- `npm run frontend:test:coverage` - coverage report (V8 backend).

CI should execute at least `frontend:lint`, `frontend:test`, and `frontend:test:a11y` before shipping.

## Build + static bundle

- `npm run frontend:build` - compile the SPA with deterministic entry points and refresh `src/frontend/static-bundle.ts`.
- `npm run build` (repository root) - rebuild the frontend and produce the Worker bundle in `dist/`.

The build writes to `dist/client/`:

- `index.html`
- Asset files under `assets/` (hashed `.js`, `.css`, fonts, images, and any route chunks emitted by Vite)

These outputs are the source of truth when publishing to the `APP_STATIC` R2 bucket.

## Automated R2 publishing

The manual `wrangler r2 object put` commands documented in `docs/frontend.md` are now scripted.

```bash
npm run publish:r2                   # Upload index.html and every file in dist/client/assets/
npm run publish:r2 -- --env preview  # Target the preview environment binding
npm run publish:r2 -- --dry-run      # Print commands without executing them
```

Behaviour:

- HTML is uploaded with `cache-control: no-store`.
- Every asset under `dist/client/assets/` (JS, CSS, fonts, images, and maps) is uploaded with `cache-control: public, max-age=31536000, immutable`.
- Uses the `APP_STATIC` binding and assumes `dist/client/` has been built.

Set `WRANGLER_BIN` if Wrangler is not on your `PATH`.

## Additional resources

- `docs/frontend.md` - architectural notes, static bundle details, and the dev-to-prod workflow.
- `npm run frontend:test` suite contains examples for mocking the API client and routing contexts.

Please update this README alongside changes to build/test workflows or asset publishing so contributors have a single source of truth.
