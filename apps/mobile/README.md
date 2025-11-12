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
MOBILE_E2E_EMAIL=
MOBILE_E2E_PASSWORD=
```

- `EXPO_PUBLIC_API_BASE` defaults to production; override for staging/local tunnels.
- `MOBILE_E2E_EMAIL` / `MOBILE_E2E_PASSWORD` power the Detox login flow; point them at a dedicated test account.

## Authentication

The app now launches with a native login screen backed by `/api/auth/login`. Credentials are stored via `expo-secure-store`, and the returned session cookie is injected into every API call. On cold start we reload the secure cookie and hit `/api/me`; if that fails we log the user out automatically.

## Common scripts

```bash
pnpm --filter @greenbro/mobile start             # expo start (tunnel recommended for devices)
pnpm --filter @greenbro/mobile run android       # run the Android client locally
pnpm --filter @greenbro/mobile run ios           # run the iOS client locally
pnpm --filter @greenbro/mobile run lint          # ESLint with import/style constraints as errors
pnpm --filter @greenbro/mobile run test          # Jest + RTL with coverage thresholds (80/55/85/85)
pnpm --filter @greenbro/mobile run e2e:build:ios
pnpm --filter @greenbro/mobile run e2e:test:ios
pnpm --filter @greenbro/mobile run e2e:build:android
pnpm --filter @greenbro/mobile run e2e:test:android
```

Need to debug Detox locally? Append `-- --record-logs all --debug-synchronization 500` to capture verbose logs.

## Cloud builds (EAS)

Local `expo run:ios` builds only succeed on macOS. On Windows/Linux, or anytime you need store-ready binaries, use Expo Application Services:

1. Install the CLI once: `npm install -g eas-cli` (or run through `npx eas`).
2. Authenticate: `eas login` (use the shared Expo account in the password vault).
3. Kick off preview builds:
   ```bash
   eas build -p ios --profile preview --non-interactive
   eas build -p android --profile preview --non-interactive
   ```
4. Watch the dashboard (https://expo.dev/accounts/<org>/projects/greenbro-mobile/builds) and download the `.ipa` / `.apk` artifacts when they finish. For Android you can also run `eas build:run -p android --latest`.
5. Install the artifacts on your simulator/device, then run:
   ```bash
   npx uri-scheme open greenbro://alerts --ios
   npx uri-scheme open greenbro://alerts --android
   ```
   to validate deep links, and use the new Detox helpers (`xcrun simctl ui ...` / `adb shell settings put secure ui_night_mode ...`) to confirm live theme swaps.

Document every build in the release ticket (profile, commit, download URL) so reviewers can verify we tested the exact binaries headed to the stores.

## Store versioning

- `apps/mobile/app.json` now tracks `ios.buildNumber` (string) and `android.versionCode` (integer). Before every release:
  1. Bump both values (e.g., `buildNumber: "1.1.0"`, `versionCode: 2`), keeping them in sync with the app `version`.
  2. Commit the change with a note referencing the release ticket.
  3. Trigger `eas build` for iOS/Android and verify the metadata in App Store Connect / Play Console.
- Keep a changelog of version codes in the release ticket so reviewers can confirm nothing was skipped.

## Detox prerequisites

- Install Xcode command-line tools, Cocoapods (`sudo gem install cocoapods`), and Watchman (`brew install watchman`).
- Run `npx expo prebuild -p ios` / `npx expo prebuild -p android` once to generate native projects (the CI workflow runs this automatically).
- Ensure an iOS Simulator (e.g., “iPhone 15”) and Android AVD (“Pixel_7_API_34”) exist locally.
- Provide `EXPO_PUBLIC_API_BASE`, `MOBILE_E2E_EMAIL`, and `MOBILE_E2E_PASSWORD` in both GitHub Secrets and `apps/mobile/.env`.
- Our nightly workflow (`.github/workflows/mobile-detox.yml`) runs both platforms headlessly; keep it green before merging PRs that touch `apps/mobile/`.

See `docs/mobile-validation.md` for the on-device QA loop and `docs/mobile-e2e-plan.md` for Detox rollout details.
