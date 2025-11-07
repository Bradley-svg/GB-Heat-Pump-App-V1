# Mobile Validation Checklist

Follow this loop whenever you need to validate the Expo client against production telemetry.

1. **Configure the API base (cookie optional for automation)**
   ```bash
   cp mobile/.env.example mobile/.env
   # Set EXPO_PUBLIC_API_BASE (prod or staging)
   # Leave EXPO_PUBLIC_SESSION_COOKIE blank unless scripting headless flows
   ```
   Everyday validation should rely on the in-app login screen; the cookie env is reserved for CI or scripted tests.

2. **Install and launch the Expo dev client**
   ```bash
   npm run mobile:install
   npm run mobile:start -- --tunnel
   ```
   Scan the QR code with Expo Go or your dev build, then sign in with a real operator account. Verify that `Dashboard` and `Alerts` populate without placeholders once authenticated.

3. **Smoke the data actions on device**
   - Pull to refresh the dashboard and ensure the toast/haptics fire without errors.
   - Filter alerts by severity and open at least one detail sheet.
   - Capture screenshots in both light/dark themes for design QA.

4. **Capture telemetry**
   Use the native dev menu (`⌘ + D` on iOS Simulator / `Ctrl + M` on Android) to toggle performance overlays and confirm frame times when scrolling KPI tiles.

Document the device/OS combo in the PR description so we can track coverage across fleets.

## Test harness notes
- `mobile/tests/__tests__/LoginScreen.test.tsx` shims `KeyboardAvoidingView` with `react-native/Libraries/Components/View/View` so Jest can render the login screen without native keyboard primitives. When upgrading React Native, confirm the internal path still exists or adjust the mock before bumping to avoid runaway recursion errors.

## Post-QA monitoring
- After validating on-device, watch the `signup_flow.resend` funnel in Dashboard/`client.event` logs to ensure resend attempts succeed at expected rates and alert if the metric deviates (per Prompt Bible observability guidance).
