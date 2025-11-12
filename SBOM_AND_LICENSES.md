# SBOM and Licenses (summary)

| Component | Notable Dependencies | License posture | Notes / Flags |
| --- | --- | --- | --- |
| `services/cn-gateway` (Node 20 distroless) | fastify 4.28 (MIT), pg 8.12 (MIT), pino 9 (MIT), otplib 12 (MIT), prom-client 15 (MIT) | All MIT / Apache-2 | Verify distroless `gcr.io/distroless/nodejs20-debian12:nonroot` contains current CA bundle + security patches during each release. |
| `services/overseas-api` (Cloudflare Workers + D1/KV/R2) | itty-router 5 (MIT), jose 5.9 (MIT), zod 3.23 (MIT), better-sqlite3 8.x (MIT) for tests | MIT | No `@noble/ed25519` present despite earlier docs; Ed25519 verification is missing entirely (see findings). Ensure Workers deploy with wrangler 4.45+ for latest `undici`. |
| `services/cn-gateway` Docker compose tooling | nginx 1.25 (BSD-2), redis 7 (BSD-3), postgres 15 (PostgreSQL) | Permissive | Remember to refresh pinned Docker image digests for nginx/postgres/redis during patch cycles. |
| SDK packages (`packages/sdk-*`, `packages/ui-*`) | zod 3 (MIT), React 18 (MIT), React Native 0.76 (MIT), TypeScript 5.9 (Apache-2) | MIT / Apache-2 | No GPL/AGPL detected. SDKs depend on React peer deps; release notes should call out peer requirements. |
| `apps/dashboard-web` (Vite SPA) | React 18 (MIT), Vite 5 (MIT), @radix-ui (MIT) | MIT | Served as static assets via Worker/R2. Add CSP header enforcement at edge (see findings). |
| `apps/mobile` (Expo/React Native) | Expo SDK 51 (MIT), react-native 0.76 (MIT), expo-secure-store (MIT) | MIT | Native modules distributed via Expo Go; ensure store submissions cover third-party notices. |
| Tooling / scripts | husky 9 (MIT), lint-staged 16 (MIT), vitest 4 (MIT) | MIT | Security posture depends on locking `pnpm-lock.yaml` (tracked). |

**License compliance status**
- No copyleft (GPL/AGPL/LGPL) dependencies detected in the workspace.
- No proprietary blobs in repo; secrets must be provided via environment/Worker secrets.
- SBOM gaps: previous documentation referenced `@noble/ed25519` which is not actually in `package.json`; update external compliance docs accordingly.

> For exhaustive transitive dependency data, generate an SPDX SBOM via `pnpm dlx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json` or `pnpm audit --json`.
