# Mobile E2E (Detox) Plan

## Goal
Automate the dashboard + alerts happy paths on iOS and Android simulators so UI regressions are caught pre-merge.

## Current status
- `expo-dev-client`, `detox`, and `@config-plugins/detox` live in `apps/mobile/package.json`.
- `apps/mobile/detox.config.ts` defines `ios.sim.debug` / `android.emu.debug` builds, plus Jest runner + init script in `apps/mobile/e2e/`.
- Credential helper + Detox specs (`auth.spec.ts`, `dashboard.spec.ts`, `alerts.spec.ts`) exercise login, KPI refresh, severity filters, and acknowledgement flows. All specs expect `MOBILE_E2E_EMAIL` / `MOBILE_E2E_PASSWORD` to be set.

## Remaining work
1. Provision deterministic test credentials (non-prod) and surface them via secrets for Detox/CI.
2. Document simulator provisioning (`xcrun simctl`, AVD Manager) and add an Actions workflow that runs `pnpm --filter @greenbro/mobile run e2e:test:ios` / `...:android` nightly (record logs for debugging).
3. Once the nightly run is stable, gate PRs touching `apps/mobile/` on the Detox lane.

Until then, continue using `docs/mobile-validation.md` for manual checks after every feature.
