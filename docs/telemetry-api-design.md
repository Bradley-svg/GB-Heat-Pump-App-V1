# Telemetry Batch & Time-Series API Design

## Overview

This document defines the new telemetry endpoints required to (1) fetch the
latest device state for many devices in one request and (2) expose richer,
bucketed time-series data suitable for dashboard charts. The goals are driven
by the near-term roadmap items:

- *Batch latest endpoint to eliminate alert N+1 calls.*
- *Historical series endpoint for richer charts.*

Both endpoints must honour the existing RBAC/tenant masking rules and slot into
the current Cloudflare Worker + D1 architecture without disruptive schema
changes.

## Goals & Non-Goals

- **Goals**
  - Provide a single call that returns the `latest_state` for a set of devices.
  - Serve aggregated telemetry buckets (min/avg/max) for configurable windows.
  - Deliver predictable JSON contracts for the SPA without breaking existing
    `/api/devices/*` routes.
  - Reuse existing scope helpers (`requireAccessUser`, `buildDeviceScope`,
    `presentDeviceId`, `resolveDeviceId`, `maskTelemetryNumber`).
- **Non-Goals**
  - Real-time streaming or websocket updates.
  - Long-term warehousing; we stay within the current D1 dataset.
  - Changing ingest payloads or persistence format.

## Endpoint Summary

| Endpoint | Method | Purpose | Auth Scope |
| --- | --- | --- | --- |
| `/api/telemetry/latest-batch` | `POST` | Resolve many device lookups to their latest state in one call. | Authenticated user; honours tenant scope. |
| `/api/telemetry/series` | `GET` | Return bucketed telemetry aggregates for charts. | Authenticated user; device/profile/fleet aware. |

## `/api/telemetry/latest-batch`

### Use Cases

- Alerts & fleet tables need the freshest vitals for up to dozens of devices
  without issuing N+1 `/api/devices/:id/latest` calls.
- Contractors can open a job summary and see every unit's status instantly.

### Contract

- **Method / Path:** `POST /api/telemetry/latest-batch`
- **Body**

  ```json
  {
    "devices": ["lookup-token-1", "lookup-token-2", "GB-ADMIN-ID-3"],
    "include": {
      "faults": true,
      "metrics": true
    }
  }
  ```

  - `devices` (required): array of lookup tokens. Admins may pass raw `device_id`
    in addition to lookup tokens.
  - `include.faults` (optional, default `true`): include parsed `faults` array.
  - `include.metrics` (optional, default `true`): include `latest_state` metrics;
    when `false`, only metadata is returned.
  - Hard limit: 200 identifiers per request. Requests exceeding the limit return
    `400`.

- **Response**

  ```json
  {
    "generated_at": "2025-10-31T15:10:05.114Z",
    "items": [
      {
        "lookup": "lookup-token-1",
        "device_id": "GB-1001",        // masked unless caller is admin
        "profile_id": "tenant-123",
        "site": "Acme HQ",
        "online": true,
        "last_seen_at": "2025-10-31T14:58:10.000Z",
        "latest": {
          "ts": 1730386685000,
          "updated_at": "2025-10-31T14:58:10.000Z",
          "supplyC": 45.2,
          "returnC": 39.8,
          "deltaT": 5.4,
          "thermalKW": 8.1,
          "cop": 3.4,
          "mode": "heating",
          "faults": [],
          "payload": null
        }
      }
    ],
    "missing": ["lookup-token-2"]
  }
  ```

  - `items`: one entry per resolvable device, ordered by request order.
  - `missing`: identifiers that could not be resolved or are out of scope.
  - Field masking: non-admin responses omit raw `device_id` inside `latest`
    payload (same as `/api/devices/:id/latest`) and precision is rounded via
    `maskTelemetryNumber`.

### Implementation Notes

1. `requireAccessUser` → build scope with `buildDeviceScope(user)`. If the scope
   is empty, return `{ items: [], missing: devices }`.
2. Resolve identifiers:
   - Admins: use `resolveDeviceId` directly; for lookups that contain admin IDs,
     just echo.
   - Tenants: validate each lookup with `resolveDeviceId`; reject lookups that
     resolve outside the scope clause.
3. Chunk resolved IDs in batches of ~100 to keep SQL placeholders manageable.
4. Query template (SQLite / D1):

   ```sql
   SELECT
     ls.device_id,
     ls.ts,
     ls.payload_json,
     ls.faults_json,
     ls.supplyC,
     ls.returnC,
     ls.deltaT,
     ls.thermalKW,
     ls.cop,
     ls.mode,
     ls.updated_at,
     d.profile_id,
     d.site,
     d.online,
     d.last_seen_at
   FROM latest_state AS ls
   JOIN devices AS d ON d.device_id = ls.device_id
   WHERE ls.device_id IN (?, ?, ...);
   ```

   - Add `AND d.profile_id IN (...)` when the caller is tenant-scoped.
   - Missing IDs are tracked by diffing the resolved list vs. returned rows.

5. Format response:
   - Use `presentDeviceId` & `buildDeviceLookup` to mirror existing identifier
     handling.
   - Parse `faults_json` only if `include.faults` is true. Reuse
     `parseFaultsJson`.
   - When `include.metrics` is false, strip the `latest` block but retain
     metadata (`online`, `site`, etc.).
6. Testing:
   - Unit tests covering admin/tenant scoping, missing lookups, include flags.
   - Integration test verifying the SQL chunking path.

### Optional View for Simplified Queries

```sql
CREATE VIEW IF NOT EXISTS latest_state_enriched AS
SELECT
  ls.*,
  d.profile_id,
  d.site,
  d.online,
  d.last_seen_at
FROM latest_state ls
JOIN devices d ON d.device_id = ls.device_id;
```

Using the view allows the handler to call `SELECT * FROM latest_state_enriched`
with only the `IN` clause.

## `/api/telemetry/series`

### Use Cases

- Device detail charts need consistent bucketed series (1 min, 5 min, 15 min,
  1 hour).
- Fleet overview wants aggregated COP/thermal curves across the caller’s scope.
- Export flows may reuse the same buckets for CSV.

### Contract

- **Method / Path:** `GET /api/telemetry/series`
- **Query Parameters**

  | Param | Type | Default | Notes |
  | --- | --- | --- | --- |
  | `scope` | `device` \| `profile` \| `fleet` | `device` | Determines aggregation target. |
  | `device` | lookup / id | — | Required when `scope=device`. |
  | `profile` | string | — | Optional filter when `scope=fleet`; required when admins request a specific tenant. |
  | `metric` | CSV | `thermalKW,cop,deltaT,supplyC,returnC,flowLps,powerKW` | Controls which series are returned. |
  | `start` | ISO-8601 or epoch ms | `now - 24h` | Inclusive window start. |
  | `end` | ISO-8601 or epoch ms | `now` | Inclusive window end. |
  | `interval` | `1m`,`5m`,`15m`,`1h`,`1d` | `5m` | Bucket size. |
  | `fill` | `null` \| `carry` | `null` | Gap-filling strategy (`carry` repeats last value when no samples). |
  | `limit` | int | `288` | Safety cap on number of buckets returned. |

- **Response**

  ```json
  {
    "generated_at": "2025-10-31T15:12:00.000Z",
    "scope": {
      "type": "device",
      "device_id": "GB-1001",
      "lookup": "lookup-token-1"
    },
    "interval_ms": 300000,
    "window": {
      "start": "2025-10-31T10:00:00.000Z",
      "end": "2025-10-31T15:00:00.000Z"
    },
    "series": [
      {
        "bucket_start": "2025-10-31T14:55:00.000Z",
        "sample_count": 4,
        "values": {
          "thermalKW": { "avg": 8.1, "min": 7.8, "max": 8.5 },
          "cop": { "avg": 3.4, "min": 3.1, "max": 3.6 },
          "deltaT": { "avg": 5.4 },
          "supplyC": { "avg": 45.2 },
          "returnC": { "avg": 39.8 }
        }
      }
    ]
  }
  ```

  - `series` is ordered by `bucket_start` ascending. Missing buckets are omitted
    unless `fill=carry`, in which case zero-count buckets are synthesized with
    `sample_count: 0`.
  - Average-only metrics (`supplyC`, `returnC`, etc.) omit `min/max` to keep the
    payload lean.

### Aggregation Query

Parameter bindings:

- `:device_id` (TEXT) OR a list of device IDs for fleet/profile modes.
- `:start_ms`, `:end_ms` (INTEGER) derived from provided timestamps.
- `:bucket_ms` (INTEGER) computed from `interval`.

```sql
WITH params AS (
  SELECT
    :bucket_ms AS bucket_ms,
    :start_ms AS start_ms,
    :end_ms AS end_ms
),
scoped AS (
  SELECT t.device_id,
         t.ts,
         t.deltaT,
         t.thermalKW,
         t.cop,
         json_extract(t.metrics_json, '$.supplyC') AS supplyC,
         json_extract(t.metrics_json, '$.returnC') AS returnC,
         json_extract(t.metrics_json, '$.flowLps') AS flowLps,
         json_extract(t.metrics_json, '$.powerKW') AS powerKW
  FROM telemetry AS t
  JOIN params p
  WHERE t.ts BETWEEN p.start_ms AND p.end_ms
    AND t.device_id IN (:device_id_list)
),
bucketed AS (
  SELECT
    (s.ts / p.bucket_ms) * p.bucket_ms AS bucket_start_ms,
    s.device_id,
    COUNT(*) AS sample_count,
    AVG(s.deltaT) AS avg_deltaT,
    MIN(s.deltaT) AS min_deltaT,
    MAX(s.deltaT) AS max_deltaT,
    AVG(s.thermalKW) AS avg_thermal_kw,
    MIN(s.thermalKW) AS min_thermal_kw,
    MAX(s.thermalKW) AS max_thermal_kw,
    AVG(s.cop) AS avg_cop,
    MIN(s.cop) AS min_cop,
    MAX(s.cop) AS max_cop,
    AVG(s.supplyC) AS avg_supplyC,
    AVG(s.returnC) AS avg_returnC,
    AVG(s.flowLps) AS avg_flowLps,
    AVG(s.powerKW) AS avg_powerKW
  FROM scoped AS s
  JOIN params AS p
  GROUP BY bucket_start_ms, s.device_id
)
SELECT *
FROM bucketed
ORDER BY bucket_start_ms ASC;
```

- For `scope=fleet/profile`, wrap the final `SELECT` in an outer aggregation that
  averages across devices per bucket.
- Ensure `ix_telemetry_device_ts` continues to serve this query efficiently. For
  large fleet aggregates, consider a secondary index on `(ts)` to support the
  range scan, but start with the existing index.

### Optional Materialised Cache

For high-traffic dashboards, we can pre-compute buckets into a table that
behaves like a materialised view:

```sql
CREATE TABLE IF NOT EXISTS telemetry_bucket_cache (
  scope_type      TEXT NOT NULL CHECK (scope_type IN ('device', 'profile', 'fleet')),
  scope_id        TEXT NOT NULL,         -- device_id or profile_id, blank for fleet
  bucket_size_ms  INTEGER NOT NULL,
  bucket_start_ms INTEGER NOT NULL,
  sample_count    INTEGER NOT NULL,
  avg_deltaT      REAL,
  min_deltaT      REAL,
  max_deltaT      REAL,
  avg_thermalKW   REAL,
  min_thermalKW   REAL,
  max_thermalKW   REAL,
  avg_cop         REAL,
  min_cop         REAL,
  max_cop         REAL,
  avg_supplyC     REAL,
  avg_returnC     REAL,
  avg_flowLps     REAL,
  avg_powerKW     REAL,
  PRIMARY KEY (scope_type, scope_id, bucket_size_ms, bucket_start_ms)
);

CREATE INDEX IF NOT EXISTS ix_bucket_cache_lookup
  ON telemetry_bucket_cache(bucket_size_ms, bucket_start_ms);
```

- A scheduled Worker (existing cron) can upsert the past N hours for each bucket
  size using the aggregation CTE above.
- The API should first attempt to read from the cache; if a bucket is missing or
  stale, backfill on-the-fly to keep responses fresh.

### Response Assembly

1. Resolve scope:
   - `scope=device`: resolve lookup → `device_id` using `resolveDeviceId`.
   - `scope=profile`: admins choose profile; tenants default to their profile
     list.
   - `scope=fleet`: use all accessible devices (skip if none → empty payload).
2. Compute `bucket_ms` from `interval`:
   - `1m` → 60_000, `5m` → 300_000, `15m` → 900_000, `1h` → 3_600_000,
     `1d` → 86_400_000.
3. Clamp window length to `limit * bucket_ms`; reject requests exceeding
   ~10,000 points with `400`.
4. Run aggregation query (directly or via cache). For tenant callers, apply
   mask precision to averages in the response.
5. Optionally perform gap filling in JS after the query for clarity; no need to
   complicate the SQL unless `fill=carry`.
6. Return metadata block (`scope`, `interval_ms`, `window`) along with the
   series array.

### Testing

- Unit tests for parameter validation, scope enforcement, and interval parsing.
- Integration tests:
  - Device scope returns masked IDs for tenants.
  - Fleet scope averages multiple devices.
  - Out-of-range requests capped by `limit`.
  - Cache warm + cold paths (if cache table is enabled).

## RBAC & Masking Checklist

- Continue to rely on `requireAccessUser`, `buildDeviceScope`, and
  `presentDeviceId` for every response.
- When returning metric values to non-admins:
  - Apply `maskTelemetryNumber` to numeric fields.
  - Avoid leaking raw `device_id` inside nested structures (`latest` payloads).
- For profile/fleet aggregations, ensure only scoped devices participate in the
  SQL `IN` clause. Admins may request arbitrary profiles; tenants cannot escape
  their assigned `profile_id`s.

## Implementation Steps

1. **Schema**
   - (Optional) Create `latest_state_enriched` view.
   - (Optional) Add `telemetry_bucket_cache` table + index.
   - Add migration file `0004_telemetry_views.sql` encapsulating the above.
2. **Routes**
   - Add `src/routes/telemetry.ts` with `handleLatestBatch` and
     `handleTelemetrySeries`.
   - Register routes in `src/router.ts`.
3. **Utilities**
   - Extend `buildDeviceLookup` with bulk helpers to reduce round-trips.
   - Reuse/extend existing `parseTs` helpers for `start/end` parsing.
4. **Tests**
   - Unit: schema validation, scope enforcement, numeric masking.
   - Integration: SQL outputs for known telemetry fixtures.
5. **Frontend**
   - Update alerts/fleet pages to call `/api/telemetry/latest-batch`.
   - Replace `/api/devices/:id/history` chart requests with the new series
     endpoint, allowing interval selection.
6. **Monitoring**
   - Add ops metric entries for both endpoints (reuse `recordOpsMetric` helper).
   - Consider logging bucket size + result counts for tuning.

## Open Questions

- Should the bucket cache be warmed continuously or lazily on first request?
- Do we need percentile stats (p95) for COP/temperature, or are min/max/avg
  sufficient for near-term charts?
- For `fill=carry`, should the API limit carry-forward to N buckets to avoid
  misrepresenting long gaps?

Answering these during implementation will help fine-tune the contracts without
breaking the high-level design captured here.

