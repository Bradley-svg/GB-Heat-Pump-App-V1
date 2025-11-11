# PR Summary
- Enforced verified TLS when the CN gateway connects to Postgres (optional `PGSSLROOTCERT` support) so mapping/audit data can’t be intercepted.
- Made `X-Device-Signature` mandatory, updated integration/e2e tests to sign every payload, and added a regression that missing headers now raise `device_signature_missing`.
- Switched the nginx front proxy to a privacy log format that redacts client IP fields.

## Testing
- `npm test -- --run` (inside `services/cn-gateway`)
