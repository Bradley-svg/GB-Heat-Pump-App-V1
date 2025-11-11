| Component | Version/Source | License | Notes |
| --- | --- | --- | --- |
| Node.js runtime | 20.x (Distroless `gcr.io/distroless/nodejs20`) | Apache 2.0 | CN gateway Dockerfile + Workers runtime. |
| Fastify | ^4.x (via `services/cn-gateway`) | MIT | CN gateway HTTP server. |
| pino | ^9.x | MIT | JSON logging with redaction; used in CN gateway. |
| prom-client | ^15.x | MIT | CN gateway Prometheus metrics. |
| @noble/ed25519 | ^1.7.5 | MIT | Batch signing/verification (both CN + overseas worker). |
| jose | ^5.9.3 | MIT | Access JWT verification (worker + new overseas guard). |
| itty-router | ^5.0.1 | MIT | Overseas batch Worker routing. |
| zod | ^3.23.8 | MIT | Runtime validation across SDKs/workers. |
| React / React Native / Expo | ^18 / ^0.73 | MIT | Dashboard/mobile clients; not directly touched in this audit. |
| wrangler / miniflare | ^4.45 / ^4.20251011.2 | Apache 2.0 | Worker tooling + local emulation. |
| pnpm workspace | root | MIT | Lockfiles currently out-of-sync for overseas API after adding `jose`. |

No copyleft or proprietary dependencies detected in touched surfaces. Keep SBOM updated when lockfiles are regenerated.
