# Mobile E2E (Detox) Plan

## Goal
Automate the dashboard + alerts happy paths on iOS and Android simulators so UI regressions are caught pre-merge.

## Current status
- `expo-dev-client`, `detox`, and `@config-plugins/detox` are installed (see `mobile/package.json`).
- `mobile/detox.config.ts` wires up placeholder build commands for `ios.sim.debug` and `android.emu.debug`.
- Jest runner config + global init live under `mobile/e2e/`, with a skipped `auth.spec.ts` that we will flesh out once dedicated test accounts exist.

## Remaining work
1. Provision deterministic test credentials (non-prod) and surface them via secrets for Detox.
2. Update `mobile/e2e/auth.spec.ts` (and add dashboard/alerts specs) to drive the new login screen, KPI scroll, and alert acknowledgement flows.
3. Document simulator provisioning (`xcrun simctl`, AVD Manager) and add an Actions workflow that runs `npm run mobile:e2e:test:ios` / `...:android` nightly.
4. Once stable, remove the `.skip` guard so Detox gates PRs touching `mobile/`.

Until then, continue using `docs/mobile-validation.md` for manual checks after every feature.
