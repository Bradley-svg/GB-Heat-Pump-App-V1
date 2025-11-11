# Mode A CN Gateway

Fastify + TypeScript Mode A gateway built for Mainland China deployments (on-prem or CN cloud). It ingests pseudonymous telemetry over HTTPS+mTLS, enforces DROP/SAFE rules, stores mappings and audit trails in Postgres, and batches SAFE metrics to an overseas endpoint with Ed25519 signatures.

> **Advisory**: This runbook is technical guidance only and likely avoids filings for this stream, subject to counsel. Always validate deployment plans and jurisdictional filings with PRC-qualified compliance teams.

## Highlights
- Node 20 + TypeScript (ESM) with Fastify, pino (JSON/redacted), Ajv 2020-12, prom-client, and Vitest.
- Nginx reverse proxy (TLS 1.2+, mutual TLS, HSTS) fronting the Fastify service.
- Pseudonymization via CN-resident KMS adapters (Alibaba, Tencent, Huawei) plus a deterministic dev adapter.
- Mode A DROP/SAFE enforcement with regex scrubbing of embedded IP/MAC/IMEI/GPS and timestamp rounding.
- Replay window (seq ring + ±120s skew), per-device rate limits (memory or Redis), and 24h idempotency cache.
- SAFE metrics queued and exported with Ed25519 signature headers (`X-Batch-Signature`) and SHA-256 checksums.
- Postgres schema for mapping/audit/export/error tables, with `migrations/migrate.ts` runner.
- Dockerized stack (distroless node image, nginx proxy, postgres, redis) and GitHub Actions CI.

```
services/cn-gateway/
├── src/                Fastify server, config, middleware, exporter, KMS adapters
├── migrations/         SQL + runner
├── openapi/            OpenAPI 3.0 definition
├── docker/             Dockerfile, compose stack, nginx config, healthcheck
├── test/               Unit/integration/e2e (Vitest + pg-mem)
├── .github/workflows/  CI pipeline
├── SECURITY.md         Threat model + operational controls
└── ADR-001.md          Decision log (Mode A adoption)
```

## Quickstart (dev KMS)
```bash
cd services/cn-gateway
cp .env.example .env      # set secrets + file paths

# Install deps & build
pnpm install
pnpm build

# Apply Postgres schema (DATABASE_URL must point to CN DB or pg-mem compatible instance)
pnpm migrate

# Launch local server (dev KMS + in-memory stores)
pnpm dev
```

### Tests
```bash
pnpm test                # run unit + integration + e2e with coverage
pnpm vitest run test/unit
```

### Docker Compose (nginx + gateway + postgres + redis)
```bash
cd services/cn-gateway
mkdir -p docker/certs

# Self-signed gateway cert
openssl req -x509 -nodes -days 365 \
  -newkey rsa:4096 \
  -keyout docker/certs/gateway.key \
  -out docker/certs/gateway.crt \
  -subj "/CN=cn-gateway.local"

# Client CA + device certificate (for mTLS)
openssl req -x509 -nodes -days 365 \
  -newkey rsa:4096 \
  -keyout docker/certs/client_ca.key \
  -out docker/certs/client_ca.crt \
  -subj "/CN=device-ca"

openssl req -newkey rsa:4096 -nodes \
  -keyout docker/certs/device.key \
  -out docker/certs/device.csr \
  -subj "/CN=device-01"
openssl x509 -req -in docker/certs/device.csr \
  -CA docker/certs/client_ca.crt \
  -CAkey docker/certs/client_ca.key \
  -CAcreateserial \
  -out docker/certs/device.crt \
  -days 365

# Start everything
docker compose -f docker/compose.yml up --build
```

> Place your Ed25519 private key at `docker/certs/export_ed25519.key` (or mount another path) so the container can sign export batches.

Sample ingest via curl (mutual TLS):
```bash
curl https://localhost:8443/ingest \
  --cert docker/certs/device.crt \
  --key docker/certs/device.key \
  --cacert docker/certs/gateway.crt \
  -H 'content-type: application/json' \
  -H 'Idempotency-Key: hp-001-20250101' \
  -d @telemetry-good.json
```

## Environment Reference
| Variable | Purpose |
| --- | --- |
| `PORT` | Fastify port (default 8080; nginx listens on 8443). |
| `DATABASE_URL` | Postgres URL located in mainland China. |
| `CN_GATEWAY_BASE` | Public base URL (for docs/log hints). |
| `KMS_PROVIDER` | `alibaba`, `tencent`, `huawei`, or `dev`. |
| `KMS_KEY_ALIAS` / `KMS_KEY_VERSION` | Active KMS key metadata. |
| `DEV_KMS_KEY` | Local secret used only when `KMS_PROVIDER=dev`. |
| `ALIBABA_*`, `TENCENT_*`, `HUAWEI_*` | Provider regions and credentials (see `.env.example`). |
| `EXPORT_ENABLED` | Disable exporter while still validating ingest (default `true`). |
| `APP_API_BASE` | Overseas ingest base (e.g., `https://global.example`). |
| `EXPORT_PROFILE_ID` | Appended to `/api/ingest/:profileId`. |
| `EXPORT_SIGNING_KEY_PATH` | Ed25519 private key (PEM). |
| `EXPORT_BATCH_SIZE` | Batch size (default 500). |
| `EXPORT_FLUSH_INTERVAL_MS` | Flush interval/backoff base (default 3000ms). |
| `RATE_LIMIT_RPM_DEVICE` | Requests/min/device (default 120). |
| `IDEMPOTENCY_TTL_HOURS` | TTL for `Idempotency-Key` cache (default 24h). |
| `TIMESTAMP_SKEW_SECS` | Timestamp skew tolerance (default 120s). |
| `REDIS_URL` | Optional redis for shared rate limit/replay/idempotency state. |
| `LOG_LEVEL` | pino level (`info` default). |
| `METRICS_ENABLED` | Toggle `/metrics`. |
| `ADMIN_TOKEN` / `ADMIN_TOTP_SECRET` | Required to hit `/admin/rotate-key`. |

See `.env.example` for a fully-populated template.

### Optional device signatures
Devices may add `X-Device-Signature: base64url(HMAC_SHA256(raw_body, key=CN_KMS[v]))`. The gateway recomputes the HMAC via the same KMS adapter and rejects mismatches with `401 device_signature_invalid`. When testing locally, set `KMS_PROVIDER=dev` and sign with `DEV_KMS_KEY`.

## Sample Payloads
**Happy path**
```json
{
  "deviceId": "hp-42",
  "seq": 101,
  "timestamp": "2025-01-05T08:10:35Z",
  "metrics": {
    "supplyC": 42.1,
    "returnC": 35.4,
    "flowLps": 0.8,
    "powerKW": 3.2,
    "COP": 4.1,
    "control_mode": "AUTO"
  }
}
```

**Forbidden content (`422`)**
```json
{
  "deviceId": "hp-42",
  "seq": 102,
  "timestamp": "2025-01-05T08:11:35Z",
  "metrics": {
    "supplyC": 44,
    "status_code": "WARN 10.10.10.10"  // embedded IP -> sanitization failure
  }
}
```

**Replay (`409`)**
Send the same `deviceId`/`seq`/`timestamp` combination twice without an `Idempotency-Key` and the second request is dropped (`{"error":"seq_replay_detected"}`).

## Health, Metrics, and Logs
- `GET /health` → `{status:"ok", version, keyVersion, exportEnabled}`.
- `GET /metrics` (Prometheus) exposes:
  - `cn_gateway_ingest_requests_total{outcome="success|failure"}`
  - `cn_gateway_ingest_latency_seconds{outcome="success|failure"}`
  - `cn_gateway_exporter_queue_size`
  - `cn_gateway_export_batches_total{status="success|failed"}`

Pino logs are JSON, redact sensitive headers/body fields, and never print raw payloads or secrets. Audit logs hash IPs via the CN KMS adapter so investigators can correlate events without storing the IP itself.

## Export Signature Verification
Each batch POST to `${APP_API_BASE}/api/ingest/${EXPORT_PROFILE_ID}` is signed with Ed25519. Upstream services must verify `X-Batch-Signature` before ingesting data.

```bash
node -e "
const fs = require('node:fs');
const crypto = require('node:crypto');
const body = fs.readFileSync('batch.json');
const signature = fs.readFileSync('batch.sig','utf8').trim();
const pubKey = fs.readFileSync('export-ed25519.pub','utf8');
if (!crypto.verify(null, body, pubKey, Buffer.from(signature,'base64'))) process.exit(1);
"
```

## CI/CD
`.github/workflows/ci.yml` runs on pushes/PRs touching this service:
1. `pnpm install --frozen-lockfile`
2. `pnpm --filter @greenbro/cn-gateway lint`
3. `pnpm --filter @greenbro/cn-gateway test -- --coverage`
4. `pnpm --filter @greenbro/cn-gateway build`
5. `docker build -f services/cn-gateway/docker/Dockerfile .`

Coverage artifacts are uploaded for traceability.

## Security & Legal Notes
- DROP/SAFE list forbids name, address, phone, email, IP, MAC, serials, IMEI/IMSI/MEID, GPS/lat/lng/geohash, SSID/BSSID, router or hostname data, photos/images, free-text/notes, and raw payloads anywhere in headers or JSON.
- `/admin/rotate-key` enforces an admin token + TOTP and logs every event; production rotations must still update CSP-managed keys and redeploy with the refreshed `KMS_KEY_VERSION`.
- Redis is optional but recommended for multi-replica deployments to keep idempotency/rate limits consistent.
- All secrets (KMS credentials, Ed25519 keys, admin tokens) must stay inside CN residency boundaries; the code never prints or exports key material.

For the full threat model, incident response checklist, and rotation SOP, read `SECURITY.md`. For rationale behind Mode A adoption and pseudonymization guarantees, see `ADR-001.md`.
