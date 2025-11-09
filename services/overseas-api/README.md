# Overseas API Worker

Cloudflare Worker that receives pseudonymized batches from the CN gateway and exposes Fleet-friendly endpoints for dashboards/mobile clients. This thin API only handles SAFE metrics and enforces Access token headers.

```
pnpm --filter @greenbro/overseas-api dev
```

Key routes:
- `POST /api/ingest/:profileId` — receives sanitized export batches
- `POST /api/heartbeat/:profileId` — monitors key version drift
- `GET /health` — for load balancers

See Prompt Bible Mode A sections 3–5 for the full contract.
