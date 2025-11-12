# Dashboard Web

## Overview

- React 19 + Vite + TypeScript now lives in `apps/dashboard-web/`.
- Build output is written to `apps/dashboard-web/dist/` (per-workspace build artifacts).
- `services/overseas-api/src/frontend/static-bundle.ts` contains an embedded fallback copy of the published build for local dev and tests.
- The Worker prefers reading assets from the `APP_STATIC` R2 bucket (keys under `app/`), falling back to the embedded bundle when missing.

## Local development

- `pnpm --filter @greenbro/dashboard-web dev` - start Vite dev server (port 5173).
- `pnpm --filter @greenbro/dashboard-web run preview` - serve the production build locally.
- `pnpm --filter @greenbro/dashboard-web run lint` - run ESLint across the UI code.

The dashboard expects API routes to be reachable on the same origin. When running `wrangler dev`, open both the Worker preview URL (serving `/app`) and the Vite dev server for live editing.

## Installing dependencies

Run `pnpm install` at the repository root. pnpm workspaces hydrate `apps/dashboard-web` automatically; no extra install step inside the app is required.

Corporate mirrors can still use `scripts/install-frontend.mjs` to generate a temporary `.npmrc` targeting the desired registry (see `docs/npm-registry.md`).

## Build + deploy workflow

1. `pnpm --filter @greenbro/dashboard-web run build`
   - Runs TypeScript build + `vite build`, emitting the entry bundle and any code-split chunks under `apps/dashboard-web/dist/assets/`.
   - Executes `apps/dashboard-web/scripts/export-static-bundle.mjs`, refreshing `services/overseas-api/src/frontend/static-bundle.ts`.
2. Upload the new assets to R2 (`APP_STATIC` bucket).

   Recommended:

   ```bash
   pnpm publish:r2            # uploads index.html and every file in apps/dashboard-web/dist/assets/
   ```

   Manual example:

   ```bash
   wrangler r2 object put APP_STATIC/app/index.html --file apps/dashboard-web/dist/index.html --content-type text/html --cache-control "no-store"
   for asset in apps/dashboard-web/dist/assets/*; do
     name="$(basename "$asset")"
     case "${name##*.}" in
       js) type="application/javascript" ;;
       css) type="text/css" ;;
       map) type="application/json" ;;
       svg) type="image/svg+xml" ;;
       png) type="image/png" ;;
       jpg|jpeg) type="image/jpeg" ;;
       webp) type="image/webp" ;;
       woff) type="font/woff" ;;
       woff2) type="font/woff2" ;;
       ico) type="image/x-icon" ;;
       *) type="application/octet-stream" ;;
     esac
     wrangler r2 object put "APP_STATIC/app/assets/$name" --file "$asset" --content-type "$type" --cache-control "public, max-age=31536000, immutable"
   done
   ```

   The publish script uploads every build artifact under `app/assets/`, matching the Worker routes and the CDN layout expected by `APP_ASSET_BASE` overrides. Each run also emits `dist/app-static-manifest.json` with the uploaded keys and checksums for release records.

   To bootstrap a fresh environment (create the bucket and upload in one step), run `pnpm ops:r2:bootstrap -- --env production`.

3. `pnpm build` (top-level) will re-run the frontend build and produce the Worker bundle ready for deployment.

### Notes

- The Worker injects `window.__APP_CONFIG__` with `returnDefault`, `apiBase`, and `assetBase` so the SPA stays in sync with worker settings.
- Override SPA endpoints by setting `APP_API_BASE` and/or `APP_ASSET_BASE` in `services/overseas-api/wrangler.toml` (or per-environment vars). `APP_API_BASE` accepts HTTPS URLs or relative paths (query strings and fragments are preserved); non-HTTP(S) schemes are rejected and the Worker falls back to the default while logging a warning. `APP_ASSET_BASE` accepts HTTPS origins, protocol-relative URLs, or relative paths and is normalized with a trailing slash (defaulting to `/app/assets/`). Invalid schemes (for example `javascript:` or `data:`) are ignored in favour of the default, and an operator warning is emitted. Point `APP_ASSET_BASE` at the `/app/assets/` prefix on your CDN (for example, `https://cdn.example.com/app/assets/`).
- If `APP_STATIC` is not bound (or a key is missing), the Worker serves the embedded bundle, ensuring `wrangler dev` works without R2 access.
- `services/overseas-api/src/frontend/static-bundle.ts` is regenerated automatically during the build - no manual edits required.
- Update favicons/metadata within `apps/dashboard-web/index.html` (reflected automatically in both R2 assets and embedded bundle).

## Scripts quick reference

| Command | Description |
| --- | --- |
| `pnpm --filter @greenbro/dashboard-web dev` | Start Vite dev server |
| `pnpm --filter @greenbro/dashboard-web run build` | Produce production build and refresh embedded bundle |
| `pnpm --filter @greenbro/dashboard-web run preview` | Serve built assets |
| `pnpm --filter @greenbro/dashboard-web run lint` | Run ESLint |
| `pnpm publish:r2` | Upload SPA assets to R2 |
| `pnpm build` | Build frontend + worker bundle (no deploy) |
| `pnpm --filter @greenbro/overseas-api deploy` | Deploy worker via Wrangler |
