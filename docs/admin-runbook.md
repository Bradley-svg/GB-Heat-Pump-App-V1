# Admin Runbook

## Admin Overview Endpoints

- `/api/admin/overview`  
  - **Access:** Admin role required (`roles` includes `admin`).  
  - **Behaviour:** Returns fleet-wide tenant counts and recent ops metrics. Non-admin callers receive `403` (`{ "error": "Forbidden" }`).

- `/api/fleet/admin-overview`  
  - **Access:** Any authenticated user.  
  - **Behaviour:** Mirrors the admin overview payload but scopes tenants and operations to the caller's device scope.

- `/api/admin/client-events/backfill`  
  - **Access:** Admin role required.  
  - **Behaviour:** Re-hashes up to 250 `client_events.user_email` rows per call using the current `CLIENT_EVENT_TOKEN_SECRET`. Invoke repeatedly until `{ "status": "complete" }` before deploying Worker changes that rely on hashed emails.

### Notes

- Both endpoints require Cloudflare Access-authenticated requests (`requireAccessUser`).  
- Ops metrics are trimmed to the latest `OPS_METRICS_WINDOW_DAYS`; the query accepts an optional `limit` param (validated via `AdminOverviewQuerySchema`).  
- The frontend `AdminPage` now calls the fleet alias so tenant users receive scoped data while admins still see full results.
