# Admin Runbook

## Admin Overview Endpoints

- `/api/admin/overview`  
  - **Access:** Admin role required (`roles` includes `admin`).  
  - **Behaviour:** Returns fleet-wide tenant counts and recent ops metrics. Non-admin callers receive `403` (`{ "error": "Forbidden" }`).

- `/api/fleet/admin-overview`  
  - **Access:** Any authenticated user.  
  - **Behaviour:** Mirrors the admin overview payload but scopes tenants and operations to the caller's device scope.

### Notes

- Both endpoints require Cloudflare Access-authenticated requests (`requireAccessUser`).  
- Ops metrics are trimmed to the latest `OPS_METRICS_WINDOW_DAYS`; the query accepts an optional `limit` param (validated via `AdminOverviewQuerySchema`).  
- The frontend `AdminPage` now calls the fleet alias so tenant users receive scoped data while admins still see full results.
