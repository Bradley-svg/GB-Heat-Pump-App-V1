# GreenBro Mobile — Developer Guide

## Prerequisites

- Node.js 20.x (managed via `nvm` or Volta recommended)
- Expo CLI (`npm install -g expo-cli`) or `npx expo` for ad-hoc commands
- Android Studio + SDK tools and/or Xcode for device simulators
- Access to the GreenBro API (production/staging) + a valid session cookie

## Environment variables

The mobile app reads Expo `EXPO_PUBLIC_*` variables at build/runtime. Copy `.env.example` to `.env` (Expo automatically picks it up) and adjust as needed:

```
EXPO_PUBLIC_API_BASE=https://app.greenbro.com
EXPO_PUBLIC_SESSION_COOKIE=gb_session=...; Path=/; Secure
```

- `EXPO_PUBLIC_API_BASE` defaults to production; override for staging or local tunnels.
- `EXPO_PUBLIC_SESSION_COOKIE` is optional but enables authenticated fetches from CI/headless environments. Never commit a real cookie—use secrets or `.env`.

## Common scripts

```bash
npm run mobile:install   # install dependencies (runs from repo root)
npm run mobile:start     # expo start (tunnel recommended for devices)
npm run mobile:lint      # ESLint with import/style constraints as errors
npm run mobile:test      # Jest + RTL with coverage thresholds (80/55/85/85)
```

See `docs/mobile-validation.md` for the on-device QA loop and `docs/mobile-e2e-plan.md` for Detox planning.
