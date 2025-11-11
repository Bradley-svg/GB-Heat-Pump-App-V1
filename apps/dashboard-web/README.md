# Mode A Dashboard (Web)

Vite + React SPA that renders fleet KPIs, top devices, and recent faults by calling the Worker’s `/api/client/compact` endpoint through `@greenbro/sdk-web`. When the API is unreachable it falls back to a bundled snapshot so installers still see a sane UI.

```
pnpm --filter @greenbro/dashboard-web dev
```

Set `VITE_APP_API_BASE` (defaults to `/api`) so the web client can talk to the deployed Worker/Access session.
