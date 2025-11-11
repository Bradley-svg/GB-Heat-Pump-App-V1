# SBOM and Licenses (summary)
| Component | Notable Dependencies | License | Notes |
| --- | --- | --- | --- |
| cn-gateway (Node 20) | fastify 4.28 (MIT), pg 8.12 (MIT), pino 9 (MIT), otplib 12 (MIT), prom-client 15 (MIT) | All MIT | No copyleft deps; ensure container base image (distroless nodejs20-debian12) remains patched. |
| Worker (`src`) | itty-router 5 (MIT), undici 6 (MIT), jose 5.9 (MIT), zod 3.23 (MIT) | MIT | Tree is ESM-only; jose relies on WHATWG crypto, ensure Node 20.
| Overseas API | itty-router 5 (MIT), @noble/ed25519 2 (MIT) | MIT | Minimal footprint but currently a stub. |
| SDKs (core/web/rn) | zod 3 (MIT), React 18 (MIT), React Native libs (MIT) | MIT | No native modules with GPL/AGPL.
| Mobile app | Expo + React Native (MIT), SecureStore (@expo) (MIT) | MIT | Verify Google Play/Apple license obligations separately.
| Frontend dashboard | React 18 (MIT), Vite 5 (MIT) | MIT | Uses internal `@greenbro/ui-*` packages.

> For full component lists see `package-lock.json` / `pnpm-lock.yaml`. No GPL/AGPL/copyleft packages were observed.
