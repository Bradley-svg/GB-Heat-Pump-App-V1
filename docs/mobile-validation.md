# Mobile Validation Checklist

Follow this loop whenever you need to validate the Expo client against production telemetry.

1. **Configure the API base**
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   # Set EXPO_PUBLIC_API_BASE (prod or staging)
   ```
   Everyday validation must rely on the in-app login screen; do not paste server-issued cookies into env files or scripts.

2. **Install and launch the Expo dev client**
   ```bash
   pnpm install
   pnpm --filter @greenbro/mobile start -- --tunnel
   ```
   Scan the QR code with Expo Go or your dev build, then sign in with a real operator account. Verify that `Dashboard` and `Alerts` populate without placeholders once authenticated.

3. **Smoke the data actions on device**
   - Pull to refresh the dashboard and ensure the toast/haptics fire without errors.
   - Filter alerts by severity and open at least one detail sheet.
   - Capture screenshots in both light/dark themes for design QA.

4. **Capture telemetry**
   Use the native dev menu (`⌘ + D` on iOS Simulator / `Ctrl + M` on Android) to toggle performance overlays and confirm frame times when scrolling KPI tiles.

Document the device/OS combo in the PR description so we can track coverage across fleets.

## Cloud build workflow (EAS)

Windows engineers (and anyone without Xcode/Android Studio locally) must rely on Expo Application Services:

1. Install/login once:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Trigger preview builds tied to the commit under test:
   ```bash
   eas build -p ios --profile preview --non-interactive
   eas build -p android --profile preview --non-interactive
   ```
3. Download the artifacts from the Expo dashboard (or via `eas build:run -p android --latest`), install them on simulators/devices, and record the build IDs in the release ticket.
4. Verify deep links and theme swaps directly against the binaries:
   ```bash
   npx uri-scheme open greenbro://alerts --ios
   npx uri-scheme open greenbro://alerts --android
   xcrun simctl ui <SIM_ID> appearance dark  # toggle themes on iOS
   adb shell settings put secure ui_night_mode 2         # toggle themes on Android
   ```
5. Re-run `npm --prefix mobile run e2e:test:ios` / `...android` once the native projects pick up the new assets so Detox exercises the same flows.

## Test harness notes
- `apps/mobile/tests/__tests__/LoginScreen.test.tsx` shims `KeyboardAvoidingView` with `react-native/Libraries/Components/View/View` so Jest can render the login screen without native keyboard primitives. When upgrading React Native, confirm the internal path still exists or adjust the mock before bumping to avoid runaway recursion errors.

## Post-QA monitoring
- After validating on-device, watch the `signup_flow.resend` funnel in Dashboard/`client.event` logs to ensure resend attempts succeed at expected rates and alert if the metric deviates (per Prompt Bible observability guidance).

## Session handling & logout retries
- The Expo client now stores `gb_session` cookies **only** inside `SecureStore`; we removed the extra in-memory cache so the raw token isn’t duplicated (Prompt Bible §0 “simple, maintainable solutions”).
- `api-client` owns the ephemeral cookie that gets attached to `fetch` requests. Any feature that needs to read the cookie (e.g., logout retry queue) must call `getSessionCookie()` instead of reaching back into storage.
- `AuthContext` subscribes to `AppState` + `NetInfo` so pending logout retries fire immediately when the app foregrounds or connectivity returns—verify the `auth.pending_logout.*` metrics stay flat after QA.
- Future hardening: if we ever drop Expo’s cookie handling in favor of the platform jars (WebBrowser/AuthSession), update this doc and the logout queue runbook _before_ shipping so operators know how to rotate credentials.
