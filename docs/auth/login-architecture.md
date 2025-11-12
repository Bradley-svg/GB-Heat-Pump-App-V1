# Auth Architecture Proposal

> Based on Prompt Bible template **#9 Architecture - Step-by-Step Design** to mirror the GREENBRO dashboard login flow diagram.

## Required Capabilities
- Public-facing routes for login (`/auth/login`), registration (`/auth/signup`), and credential recovery (`/auth/recover`), with inline validation loops on failure.
- Secure credential storage via salted and stretched hashes plus a profile record that captures the signup form's personal information branch.
- Session issuance that survives refreshes, powers logout, and gates the existing `/app/*` dashboard content.
- Single-use password reset tokens that log the delivery action (email hook stubbed for now) to reflect the "email sent to you" node.
- Role assignment (`admin`, `client`, `contractor`) preserved so downstream RBAC logic keeps working.

## Data Model & Key Entities
| Entity | Columns | Notes |
| --- | --- | --- |
| `users` | `id TEXT PK`, `email TEXT UNIQUE`, `password_hash TEXT`, `password_salt TEXT`, `password_iters INTEGER`, `roles TEXT`, `client_ids TEXT`, `profile_id TEXT`, `created_at TEXT`, `updated_at TEXT`, `verified_at TEXT NULL` | Core credential record. `roles` and `client_ids` stored as JSON strings to reuse existing role parsing. |
| `user_profiles` | `user_id TEXT PK FK`, `first_name TEXT`, `last_name TEXT`, `phone TEXT`, `company TEXT`, `metadata JSON` | Holds the signup form's personal details. |
| `sessions` | `id TEXT PK`, `user_id TEXT FK`, `token_hash TEXT`, `created_at TEXT`, `expires_at TEXT`, `revoked_at TEXT NULL`, `last_seen_at TEXT` | Stores rolling session state. `token_hash` is the SHA-256 of the opaque cookie value. |
| `password_resets` | `token_hash TEXT PK`, `user_id TEXT FK`, `created_at TEXT`, `expires_at TEXT`, `used_at TEXT NULL` | Tracks reset links and enforces single use. |

## Modules & Responsibilities
- `src/lib/auth/password.ts`: PBKDF2 helpers for hashing, verification, and base64 serialisation.
- `src/lib/auth/sessions.ts`: Session token generation, hashing, cookie helpers, and lookup logic.
- `src/routes/auth.ts`: Worker handlers for signup, login, logout, recover, and reset endpoints.
- `src/routes/me.ts`: Updated to accept either a signed session cookie or a Cloudflare Access JWT.
- `src/router.ts`: Wires the new `/api/auth/*` endpoints.
- `apps/dashboard-web/src/auth/*`: React screens for login/signup/recover/reset embedded in a dedicated auth router.

## Interfaces to Other Systems
- **Email delivery**: Reset links are logged with `systemLogger`. A future SMTP/SendGrid adapter can plug in at this seam.
- **Dashboard API**: Existing `/api/*` handlers still call `requireAccessUser` (now session-aware) and receive the same `CurrentUser` shape.
- **Cloudflare Access**: Remains in place for privileged admin access. Session cookies are checked first, then Access headers as a fallback.

## Design Patterns & Rationale
- **Adapter**: `requireAccessUser` now adapts dual auth sources (cookie or Access JWT) without changing downstream handlers.
- **Factory**: Session helper centralises token creation, storage, and cookie serialisation.
- **Strategy**: Password hashing logic lives behind a single module so PBKDF2 can be swapped for Argon2 later.
- **State machine (implicit)**: Frontend forms follow the supplied diagram, keeping users on the current node when validation fails.

## Scale & Operability
- Target population: up to 10k accounts. Default PBKDF2 cost is 100,000 iterations, overridable with `PASSWORD_PBKDF2_ITERATIONS`.
- Database indexes: `sessions.token_hash` (`UNIQUE`) and `sessions.user_id` support fast lookups and cleanup jobs.
- Observability: Logs `auth.*` events (login success/failure, signup, password reset) with redacted emails, and integrates with `recordOpsMetric`.
- Security: Cookies use `Secure`, `HttpOnly`, and `SameSite=Strict`. Session teardown clears cookies even on fallback Access redirects.
- Recovery: `sessions` and `password_resets` tables can be truncated safely during incident response; `users` participates in existing snapshots.

```
                       +----------------------+
Guest hits /auth/... ->| React Auth Router    |
                       | (forms + validation) |
                       +-----------+----------+
                                   |
                                   v
                        POST /api/auth/(...)
                                   |
                     +-------------+-------------+
                     |                           |
             Hash password + profile write   Issue session cookie
                     |                           |
                     +-------------+-------------+
                                   v
                         Redirect user to /app
                                   |
                                   v
                       requireAccessUser (updated)
                      (session cookie or Access JWT)
                                   |
                                   v
                    Existing dashboard routes/layout
```

**Assumptions**
- Cloudflare Access stays enabled for admin tenants; email/password auth is additive.
- Logging reset links is acceptable for MVP until SMTP infrastructure is ready.
- Worker execution time tolerates PBKDF2 at the chosen iteration count.

**Open Questions**
- Should new accounts require email verification before dashboard access?
- Do client signups auto-provision a tenant or wait for admin approval?
- Where does company metadata captured at signup ultimately live?

**Risks**
- Dual auth paths add complexity; misconfiguration could bypass Access policies.
- Logging-only reset delivery may confuse users if no email integration follows quickly.
- PBKDF2 cost tuning impacts perceived latency during login spikes.

**Next 3 Actions**
1. Deploy D1 migration and environment schema updates for auth tables/secrets.
2. Harden session and password helpers with deeper integration tests (e.g., cookie round-trips).
3. Flesh out profile edit/notification pages to complete the post-login branch in the flow diagram.
