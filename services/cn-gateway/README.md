# CN Gateway (Mode A)

Fastify-based ingress layer deployed in mainland China. Responsibilities:

- Validate device ingest payloads against shared SAFE metrics list
- Apply pseudonymization + filtering before forwarding batches overseas
- Expose admin endpoints for heartbeat and key rotation approvals

## Development

```
pnpm --filter @greenbro/cn-gateway dev
```

Environment variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default `8080`) |
| `KMS_KEY_VERSION` | Surfaced on `/health` |

Routes implemented in this scaffold map directly to the API contract described in the Prompt Bible (Mode A sections 4–5).
