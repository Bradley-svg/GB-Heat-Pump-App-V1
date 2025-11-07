# Mobile E2E (Detox) Plan

## Goal
Automate the “happy path” (Dashboard KPI load, Alerts filter/ack) on both Android + iOS simulators so we catch regressions before shipping.

## Dependencies

| Tool | Version | Notes |
| --- | --- | --- |
| Detox | `^20.x` | Works with RN 0.76; install as devDependency in `mobile/package.json`. |
| Jest | already present | Detox plugs into Jest runner. |
| expo-dev-client | `~4.0` | Needed to build custom dev clients for Detox. |
| Apple Xcode 15 / Android API 34 SDK | for simulators |

## Proposed file structure

```
mobile/
  e2e/
    detox.config.ts      # extends expo-detox-tools (when added)
    init.ts              # global setup (login helper)
    dashboard.spec.ts    # KPI load + CTA toast assertions
    alerts.spec.ts       # severity filter + acknowledge flow
```

## Test data & auth
Detox runs will reuse the same environment contract we added for CI:

- `EXPO_PUBLIC_API_BASE`
- `EXPO_PUBLIC_SESSION_COOKIE`

Store both as GitHub Secrets (`EXPO_PUBLIC_API_BASE`, `MOBILE_SESSION_COOKIE`) and surface via workflow env vars. Locally, put them in `mobile/.env`.

## Open tasks
1. Add `expo-dev-client`, `detox`, and `@config-plugins/detox` to `mobile/package.json`.
2. Create a `detox.config.ts` using `detox-expo-helpers` (Metro bundler automation).
3. Write onboarding docs for provisioning iOS simulators (`xcrun simctl create` etc.).
4. Gate CI via a nightly job (Detox matrix for `ios.sim.debug` + `android.emu.debug`) once the backend cookie automation is stable.

Until these are done, keep relying on `docs/mobile-validation.md` for manual coverage but treat this file as the source of truth for the rollout checklist.
