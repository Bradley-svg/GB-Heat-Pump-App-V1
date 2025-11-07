# Mobile Validation Checklist

Follow this loop whenever you need to validate the Expo client against production telemetry.

1. **Configure the API base + cookie**
   ```bash
   cp mobile/.env.example mobile/.env
   # Edit the file to set EXPO_PUBLIC_API_BASE and EXPO_PUBLIC_SESSION_COOKIE
   ```
   Or export the vars inline (`export EXPO_PUBLIC_API_BASE=...`). These propagate into `api-client.ts`, so both the dashboard and alerts fetch from the live worker with the same cookie the web client uses.

2. **Install and launch the Expo dev client**
   ```bash
   npm run mobile:install
   npm run mobile:start -- --tunnel
   ```
   Scan the QR code with the Expo Go app or your dev build; verify that `Dashboard` and `Alerts` populate without placeholders.

3. **Smoke the data actions on device**
   - Pull to refresh the dashboard and ensure the toast/haptics fire without errors.
   - Filter alerts by severity and open at least one detail sheet.
   - Capture screenshots in both light/dark themes for design QA.

4. **Capture telemetry**
   Use the native dev menu (`⌘ + D` / `Ctrl + M`) to toggle performance overlays and confirm frame times when scrolling KPI tiles.

Document the device/OS combo in the PR description so we can track coverage across fleets.
