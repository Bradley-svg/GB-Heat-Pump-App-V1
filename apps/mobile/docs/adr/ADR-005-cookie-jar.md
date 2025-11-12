# ADR-005 – Mobile Session Persistence Strategy

| Status | Proposed |
| --- | --- |
| Date | 2025-11-07 |

## Context

The Expo client currently stores the `gb_session` cookie in `SecureStore` and mirrors it inside the JS runtime so API calls can attach `Cookie` headers manually. Prompt Bible §0 asks us to “prefer simple, maintainable solutions” and to avoid leaking sensitive data (Appendix C – Definition of Done). Keeping a duplicate copy of the cookie in memory increases the blast radius of any JS compromise, while relying solely on `SecureStore` still leaves the token vulnerable to exfiltration if an attacker can read device storage.

Expo supports two safer options:

1. **Platform cookie jars** via `expo-auth-session` / `WebBrowser` (iOS/Android manage `HttpOnly` cookies automatically).
2. **Encrypted storage** (e.g., `expo-secure-store` + `expo-crypto`) where the cookie is wrapped with a device-bound key and only decrypted long enough to make a request.

## Decision (in progress)

- Remove the redundant in-memory cache (done in this change) so the only copy lives in `SecureStore`.
- Evaluate migrating to the OS cookie jar for all future sessions (preferred), falling back to an encrypted token envelope if platform cookies cannot be used for the existing API shape.

## Trade-offs

| Option | Pros | Cons |
| --- | --- | --- |
| Platform cookie jar | Native `HttpOnly` enforcement, zero JS surface, automatic eviction when the browser clears cookies. | Requires hosting login/refresh flows in a browser context; needs additional deep-link plumbing back into the Expo app. |
| Encrypted SecureStore blob | Keeps current login UX (no browser bounce) and still avoids storing raw cookies on disk. | Still requires decrypting the cookie inside JS before each request; extra crypto + key-rotation work. |

## Next Steps

1. **AuthSession prototype (Workstream 5 spike)**  
   Owner: Mobile platform (cc: @greenbro-mobile). Build an `expo-auth-session` flow that walks through Cloudflare Access + `/api/auth/login`, captures the session cookie from the platform jar, and bounces back into the Expo app. Success criteria: `signup_flow.*` telemetry unchanged, login latency < +10%, logout queue still drains.
2. **Encrypted envelope fallback**  
   If AuthSession is blocked, design a cookie envelope (`version|iv|ciphertext|mac`) using `expo-secure-store` + `expo-crypto` so the token is only decrypted long enough to attach request headers.
3. Update `docs/mobile-validation.md`, logout runbooks, and operator SOPs once we pick a path (Prompt Bible Appendix C – DoD requires docs + observability before release).

_Reference: Prompt Bible Appendix C – Definition of Done (security & observability must be explicit before shipping)._ 
