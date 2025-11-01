# Frontend Dashboard

## Overview

- React 19 + Vite + TypeScript now lives in `frontend/`.
- Build output is written to `dist/client/` (shared top-level `dist/`).
- `src/frontend/static-bundle.ts` contains an embedded fallback copy of the published build for local dev and tests.
- The Worker prefers reading assets from the `APP_STATIC` R2 bucket (keys under `app/`), falling back to the embedded bundle when missing.

## Local development

- `npm run frontend:dev` – start Vite dev server (port 5173).
- `npm run frontend:watch` – same dev server, but bound to all interfaces for tunnelling.
- `npm run frontend:lint` – run ESLint across the UI code.
- `npm run frontend:preview` – serve the production build locally.

The dashboard expects API routes to be reachable on the same origin. When running `wrangler dev`, open both the Worker preview URL (serving `/app`) and the Vite dev server for live editing.

## Build + deploy workflow

1. `npm run frontend:build`
   - Runs TypeScript build + `vite build`, emitting the entry bundle and any code-split chunks under `dist/client/assets/`.
   - Executes `frontend/scripts/export-static-bundle.mjs`, refreshing `src/frontend/static-bundle.ts`.
2. Upload the new assets to R2 (`APP_STATIC` bucket).

   Recommended:

   ```bash
   npm run publish:r2            # uploads index.html and every file in dist/client/assets/
   npm run publish:r2 -- --env preview
   ```

   Manual example:

   ```bash
   wrangler r2 object put APP_STATIC/app/index.html --file dist/client/index.html --content-type text/html --cache-control "no-store"
   for asset in dist/client/assets/*; do
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

   The publish script uploads every build artifact under `app/assets/`, matching the Worker routes and the CDN layout expected by `APP_ASSET_BASE` overrides.

3. `npm run build` (top-level) will re-run the frontend build and produce the Worker bundle in `dist/` ready for deployment.

### Notes

- The Worker injects `window.__APP_CONFIG__` with `returnDefault`, `apiBase`, and `assetBase` so the SPA stays in sync with worker settings.
- Override SPA endpoints by setting `APP_API_BASE` and/or `APP_ASSET_BASE` in `wrangler.toml` (or per-environment vars). Values are trimmed, `APP_ASSET_BASE` is normalized with a trailing slash (defaulting to `/app/assets/`), and the CSP automatically includes the configured origin so browsers can reach remote APIs/CDNs. Point `APP_ASSET_BASE` at the `/app/assets/` prefix on your CDN (for example, `https://cdn.example.com/app/assets/`).
- If `APP_STATIC` is not bound (or a key is missing), the Worker serves the embedded bundle, ensuring `wrangler dev` works without R2 access.
- `src/frontend/static-bundle.ts` is regenerated automatically during `frontend:build` - no manual edits required.
- Update favicons/metadata within `frontend/index.html` (will be reflected automatically in both R2 assets and embedded bundle).

## Scripts quick reference

| Command | Description |
| --- | --- |
| `npm run frontend:dev` | Start Vite dev server |
| `npm run frontend:build` | Produce production build and refresh embedded bundle |
| `npm run frontend:watch` | Dev server listening on `0.0.0.0` |
| `npm run frontend:preview` | Serve built assets |
| `npm run frontend:lint` | Run ESLint |
| `npm run build` | Build frontend + worker bundle (no deploy) |
| `npm run deploy` | Deploy worker via Wrangler |
