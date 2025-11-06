# Backend Worker API & Routing Security Audit

## Scope

Audit focused on Cloudflare Worker entrypoints and routing helpers, including:

- Request dispatcher and route registration in [`src/router.ts`](../src/router.ts)
- Authentication helpers in [`src/lib/access.ts`](../src/lib/access.ts)
- Environment validation logic in [`src/env.ts`](../src/env.ts)
- Representative route handlers such as [`src/routes/fleet.ts`](../src/routes/fleet.ts) and ingest endpoints in [`src/routes/ingest.ts`](../src/routes/ingest.ts)

Checks covered authentication, access control, input validation, logging, and CORS behaviour per Prompt Bible §25.

## Findings

| ID | Area | Finding | Impact | Recommendation | Example Patch |
| --- | --- | --- | --- | --- | --- |
| F-1 | Route wiring (`src/router.ts`) | Each API handler performs its own `requireAccessUser` call, and there is no router-level guard to enforce Cloudflare Access authentication by default. A future contributor could register a new `/api/*` route and forget to add the check, unintentionally exposing data. | Medium – accidental data disclosure when new endpoints are added hastily. | Introduce a shared wrapper (e.g. `withAccess`) that centralises the Cloudflare Access check and passes the authenticated user into downstream handlers. Register `/api/*` routes through that helper to make the secure path the default. | ```diff
+import { requireAccessUser } from "../lib/access";
+
+export const withAccess = (handler) => async (req, env, ...rest) => {
+  const user = await requireAccessUser(req, env);
+  if (!user) {
+    return json({ error: "Unauthorized" }, { status: 401 });
+  }
+  return handler(req, env, user, ...rest);
+};
+
+router.get("/api/fleet/summary", withAccess(handleFleetSummary));
``` |
| F-2 | Dev access shim (`src/lib/access.ts`, `src/env.ts`) | `resolveDevUser` enables a fully privileged user whenever `ALLOW_DEV_ACCESS_SHIM` and `DEV_ALLOW_USER` are set. Env validation only checks that the base URL looks “local”, so a misconfigured production deployment pointing at an internal `.local` domain could still satisfy the condition and silently bypass Cloudflare Access. | High – privilege escalation in misconfigured environments. | Gate the shim behind an explicit deployment-mode flag (e.g. `ENVIRONMENT=development`) or require an additional signed secret before returning the dev user. Also add logging/metrics when the shim activates to aid detection. | ```diff
 export async function requireAccessUser(req: Request, env: Env): Promise<User | null> {
   const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
   if (jwt) {
     ...
   }
-
-  return resolveDevUser(env);
+
+  if (env.ENVIRONMENT === "development") {
+    return resolveDevUser(env);
+  }
+
+  loggerForRequest(req, { scope: "access" }).warn("access.dev_shim_blocked");
+  return null;
 }
``` |
| F-3 | Ingest endpoint rate limiting (`src/routes/ingest.ts`) | `isRateLimited`/`isFailureRateLimited` rely on D1 queries per request without protecting the helper itself from DoS. The checks occur before signature validation, so an attacker can spam unique device IDs to force two queries per request and stress D1. | Medium – resource exhaustion against the database backing the worker. | Add a lightweight KV or Durable Object-backed token bucket keyed by connecting IP before hitting D1, or cache recent rejections in memory to short-circuit obvious abuse. | ```diff
 export async function handleIngest(req: Request, env: Env, profileId: string) {
   const t0 = Date.now();
   const log = loggerForRequest(req, { route: `${INGEST_ROUTE}/:profile`, profile_id: profileId });
+
+  if (await isIpRateLimited(env, req)) {
+    await logAndRecordEarlyExit(env, INGEST_ROUTE, 429, t0, log, "ingest.ip_rate_limited");
+    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }));
+  }
``` |

## Positive Controls Observed

- Every JSON/text helper applies strict security headers (CSP, HSTS, COOP) via [`withSecurityHeaders`](../src/utils/responses.ts), so API responses inherit a hardened baseline.
- Device, telemetry, and alert routes validate query parameters and request bodies with Zod schemas before touching the database, reducing injection risk.
- Ingest and heartbeat routes enforce HMAC signatures, nonce deduplication, and configurable tolerance windows, providing strong replay protection.

## Follow-up Checklist

- [x] Add the centralised `withAccess` wrapper and migrate existing `/api/*` registrations.
- [x] Introduce an explicit deployment-mode flag that controls the dev access shim.
- [x] Implement an IP-level throttle in front of ingest/heartbeat routes (KV-backed `INGEST_IP_BUCKETS` namespace).
- [ ] Document the new guardrails in contributor guidelines to prevent regressions.
- [ ] Monitor Miniflare release notes so the `undici` override can be removed once patched upstream.

---
**Assumptions** - Cloudflare Access is the primary auth mechanism - `APP_BASE_URL` may point to non-local hosts in staging - D1 remains the persistence layer for ingest metrics
**Open Questions** - Should contractors have narrower scopes for ingest telemetry? - Are additional KV namespaces required for region-specific limits?
**Risks** - Missing wrapper adoption by future routes - Ops overhead of maintaining additional rate-limit storage - Potential shim enablement in staging during incidents
**Next 3 Actions** - Document the `INGEST_IP_BUCKETS` provisioning steps in contributor onboarding - Add alerting on `ingest.ip_kv_bucket_failed` warnings so fallbacks surface quickly - Re-evaluate Durable Object vs. KV once ingest volume growth data is available

