# GreenBro Mobile — Developer Guide

## Prerequisites

- Node.js 20.x (managed via `nvm` or Volta recommended)
- Expo CLI (`npm install -g expo-cli`) or `npx expo`
- Android Studio + SDK tools and/or Xcode for device simulators
- GreenBro operator credentials (email + password)

## Environment variables

Copy `.env.example` to `.env` and set any overrides you need:

```
EXPO_PUBLIC_API_BASE=https://app.greenbro.com
EXPO_PUBLIC_SESSION_COOKIE=
MOBILE_E2E_EMAIL=
MOBILE_E2E_PASSWORD=
```

- `EXPO_PUBLIC_API_BASE` defaults to production; override for staging/local tunnels.
- `EXPO_PUBLIC_SESSION_COOKIE` is only for CI/headless automation. Leave it blank locally and **never** commit a real cookie.
- `MOBILE_E2E_EMAIL` / `MOBILE_E2E_PASSWORD` power the Detox login flow; point them at a dedicated test account.

## Authentication

The app now launches with a native login screen backed by `/api/auth/login`. Credentials are stored via `expo-secure-store`, and the returned session cookie is injected into every API call. On cold start we reload the secure cookie and hit `/api/me`; if that fails we log the user out automatically.

## Common scripts

```bash
npm run mobile:install          # install dependencies (run from repo root)
npm run mobile:start            # expo start (tunnel recommended for devices)
npm run mobile:lint             # ESLint with import/style constraints as errors
npm run mobile:test             # Jest + RTL with coverage thresholds (80/55/85/85)
npm run mobile:e2e:build:ios    # detox build for the iOS simulator (requires prebuild)
npm run mobile:e2e:test:ios     # run the detox suite on iOS (uses MOBILE_E2E_* env vars)
npm run mobile:e2e:build:android
npm run mobile:e2e:test:android
```

Need to debug Detox locally? Append `-- --record-logs all --debug-synchronization 500` to capture verbose logs.

## Detox prerequisites

- Install Xcode command-line tools, Cocoapods (`sudo gem install cocoapods`), and Watchman (`brew install watchman`).
- Run `npx expo prebuild -p ios` / `npx expo prebuild -p android` once to generate native projects (the CI workflow runs this automatically).
- Ensure an iOS Simulator (e.g., “iPhone 15”) and Android AVD (“Pixel_7_API_34”) exist locally.
- Provide `EXPO_PUBLIC_API_BASE`, `MOBILE_E2E_EMAIL`, and `MOBILE_E2E_PASSWORD` in both GitHub Secrets and `mobile/.env`.
- Our nightly workflow (`.github/workflows/mobile-detox.yml`) runs both platforms headlessly; keep it green before merging PRs that touch `mobile/`.

See `docs/mobile-validation.md` for the on-device QA loop and `docs/mobile-e2e-plan.md` for Detox rollout details.
