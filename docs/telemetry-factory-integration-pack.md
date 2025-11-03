# Telemetry: Factory Integration Pack

This kit gives the factory everything it needs to run the first live telemetry test against the production Worker. It covers environment readiness, the bench device credentials, exact HTTP payloads, and the validation steps operators should follow while the controller is posting data.

---

## 1. Readiness Snapshot
- **Worker build** - `/api/ingest/:profile` and `/api/heartbeat/:profile` are fully implemented with HMAC signing, device key enforcement, rate limiting, and ops metrics recording (`src/routes/ingest.ts`, `src/utils/index.ts`).
- **Database schema** - D1 migrations ship tables for `devices`, `latest_state`, `telemetry`, and `ops_metrics` plus supporting indexes (`migrations/001_init.sql`, `0002_indexes.sql`, `0004_ops_metrics_window.sql`, `0005_ops_metrics_rate_limit_index.sql`, `0008_device_key_hash_constraint.sql`).
- **Secrets guardrail** - The worker refuses to boot without required secrets (`src/env.ts`). Production must have:
  - `CURSOR_SECRET`
  - `ACCESS_AUD`, `ACCESS_JWKS_URL`
  - `INGEST_ALLOWED_ORIGINS` (comma-separated; no wildcard in prod)
  - `INGEST_RATE_LIMIT_PER_MIN` (recommend `120`)
  - `INGEST_SIGNATURE_TOLERANCE_SECS` (recommend `300`)
- **R2 assets & Access** - Not required for ingest itself but must remain configured for the SPA and Access authentication (`wrangler.toml`, `docs/secret-management.md`).

> Ready: If the above bindings exist and D1 migrations are applied, the app is ready to ingest factory telemetry. The only remaining action is to provision the bench device record and share the credentials below.

---

## 2. Factory Bench Device Credentials

| Field | Value | Notes |
| --- | --- | --- |
| Device ID | `GB-HP-FACTORY-01` | Printed on the bench unit & QR label. |
| Profile ID | `profile-factory` | Keep distinct from live customer profiles. |
| Raw device key | `GBR-Factory-2025-Alpha` | Shared secret to flash onto the controller. |
| SHA-256 hash | `39363e4648801ff2cee1edb791109fe206fc5caa2ebd98e6339c4399a18231a5` | Store in `devices.device_key_hash` (lowercase hex). |

**Provisioning SQL**

```sql
INSERT INTO devices (
  device_id,
  profile_id,
  device_key_hash,
  firmware,
  map_version,
  online,
  last_seen_at
) VALUES (
  'GB-HP-FACTORY-01',
  'profile-factory',
  '39363e4648801ff2cee1edb791109fe206fc5caa2ebd98e6339c4399a18231a5',
  '1.0.0-factory',
  'gb-map-v1',
  0,
  NULL
) ON CONFLICT(device_id) DO UPDATE SET
  profile_id=excluded.profile_id,
  device_key_hash=excluded.device_key_hash,
  firmware=excluded.firmware,
  map_version=excluded.map_version,
  online=excluded.online,
  last_seen_at=excluded.last_seen_at;
```

Apply with Wrangler:

```bash
wrangler d1 execute GREENBRO_DB --file ./docs/sql/factory-device.sql
```

or run the statement inline with `--command`.

---

## 3. Cloudflare Environment Checklist

1. **Run migrations**
   ```bash
   wrangler d1 migrations apply GREENBRO_DB
   ```
2. **Seed/update the factory device** - execute the SQL above.
3. **Secrets**
   ```bash
   printf 'https://devices.greenbro.io,https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev' | wrangler secret put INGEST_ALLOWED_ORIGINS
   printf '120' | wrangler secret put INGEST_RATE_LIMIT_PER_MIN
   printf '300' | wrangler secret put INGEST_SIGNATURE_TOLERANCE_SECS
   ```
   Re-run `wrangler secret list` to confirm bindings.
4. **Deploy (if needed)**
   ```bash
   npm run deploy
   wrangler triggers deploy
   ```
5. **Access spot-check** - confirm `/app` still prompts via Cloudflare Access and `wrangler tail` shows no `env` validation errors.

---

## 4. Telemetry & Heartbeat Payloads

### Canonical signing rules
1. Controller sends the **raw key** (`GBR-Factory-2025-Alpha`) in `X-GREENBRO-DEVICE-KEY`.
2. Controller computes `hashedKey = sha256(rawKey)` -> `39363e4648801ff2cee1edb791109fe206fc5caa2ebd98e6339c4399a18231a5`.
3. Canonical string: `${timestamp}.${rawJson}` (no spaces beyond JSON separators).
4. HMAC-SHA256 over the canonical string using `hashedKey` (hex decoded).
5. Send lowercase hex digest in `X-GREENBRO-SIGNATURE`.
6. `X-GREENBRO-TIMESTAMP` must match the timestamp used in the signature (ISO-8601 UTC or epoch).

### Sample heartbeat

```
POST https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev/api/heartbeat/profile-factory
X-GREENBRO-DEVICE-KEY: GBR-Factory-2025-Alpha
X-GREENBRO-TIMESTAMP: 2025-10-25T10:12:00Z
X-GREENBRO-SIGNATURE: aa7522dc14b64604d6a32570ac9cc5125a0f762e05a8c1914a411353060acd9a
Content-Type: application/json

{"device_id":"GB-HP-FACTORY-01","rssi":-60,"ts":"2025-10-25T10:12:00Z"}
```

### Sample telemetry post

```
POST https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev/api/ingest/profile-factory
X-GREENBRO-DEVICE-KEY: GBR-Factory-2025-Alpha
X-GREENBRO-TIMESTAMP: 2025-10-25T10:12:05Z
X-GREENBRO-SIGNATURE: 8444358f44376213154006dec76ce12eee2a803c45533cc7d441486b41ea38a4
Content-Type: application/json

{"device_id":"GB-HP-FACTORY-01","faults":[],"metrics":{"mode":"HEAT","supplyC":47.1,"eevSteps":56,"compCurrentA":7.8,"returnC":41.6,"ambientC":20,"tankC":44,"flowLps":0.2,"defrost":0,"powerKW":1.8},"ts":"2025-10-25T10:12:05Z"}
```

> Tip: When generating signatures in firmware, reuse the JSON string verbatim between signing and transmission to avoid whitespace mismatches.

---

## 5. Verification Workflow

1. **Tail logs**
   ```bash
   wrangler tail
   ```
   Expect `heartbeat.accepted` and `ingest.accepted` with `device_id=GB-HP-FACTORY-01`.
2. **Confirm latest state**
   ```bash
   wrangler d1 execute GREENBRO_DB --command "
     SELECT device_id, online, last_seen_at FROM devices WHERE device_id='GB-HP-FACTORY-01';
     SELECT device_id, supplyC, returnC, flowLps, updated_at FROM latest_state WHERE device_id='GB-HP-FACTORY-01';
   "
   ```
   `online` should flip to `1`, `updated_at` aligns with telemetry timestamp.
3. **Check telemetry history**
   ```bash
   wrangler d1 execute GREENBRO_DB --command "
     SELECT device_id, ts, json_extract(metrics_json, '$.supplyC') AS supplyC
     FROM telemetry WHERE device_id='GB-HP-FACTORY-01' ORDER BY ts DESC LIMIT 5;
   "
   ```
4. **UI spot check** - Log in via the dashboard, open `/app/device?device=GB-HP-FACTORY-01` (admin role) and confirm live tiles refresh within ~20 seconds.
5. **Ops metrics** - Optional sanity for rate limiting and status distribution:
   ```bash
   wrangler d1 execute GREENBRO_DB --command "
     SELECT route, status_code, COUNT(*) as hits
     FROM ops_metrics
     WHERE device_id='GB-HP-FACTORY-01'
     AND ts >= datetime('now', '-5 minutes')
     GROUP BY route, status_code;
   "
   ```

---

## 6. Troubleshooting Matrix

| Symptom | Likely cause | Recovery |
| --- | --- | --- |
| `401 Unauthorized` | Missing/incorrect `X-GREENBRO-DEVICE-KEY` or device not provisioned. | Reflash secret, re-run provisioning SQL, or check for typos in Device ID. |
| `401` with `Invalid signature` | HMAC computed with wrong key/JSON mismatch. | Ensure signature uses hashed key, confirm timestamp & JSON match exactly. |
| `409 Profile mismatch` | Controller hitting the wrong `:profile` path. | Update firmware URL to `/api/(ingest|heartbeat)/profile-factory`. |
| `429 Rate limit exceeded` | Heartbeat/telemetry cadence > configured limit. | Increase `INGEST_RATE_LIMIT_PER_MIN` (if justified) and redeploy secret; verify firmware poll interval. |
| `413 Payload too large` | Payload > 256 KB. | Reduce batch size or compression. |
| No logs, HTTP timeout | Cloudflare Access block or DNS mis-pointed. | Verify Access token, DNS routing, and that the Worker deployed successfully. |

---

## 7. Next Steps After Successful Test
- Archive controller logs and signatures for traceability.
- Promote the factory profile to production naming (`profile-factory` -> `profile-preprod`) as needed, or mint additional credentials per bench line.
- Schedule ingestion smoke tests (`npm run test:smoke`, `npm run test:security`) to baseline future firmware updates.
- Update the factory checklist to reference this pack so each run follows the same sequence.



