# Performance Test Plan — GreenBro Worker & SPA

## KPIs
- P95 latency: `<250 ms` for `/api/telemetry/latest-batch` (50 devices) and `<500 ms` for `/api/telemetry/series` (24h, 10 metrics).
- Throughput: Sustain `150 req/s` combined telemetry API load with <1% error rate.
- Error rate: `<0.5%` 5xx responses during soak; zero auth bypasses (`401` expected for unauthenticated).

## Workloads
- **Telemetry Latest Batch:** Concurrent requests with varying device counts (10, 50, 150). Payload mix includes include-flags toggles and missing tokens to exercise masking logic.
- **Telemetry Series:** GET queries across time windows (6h, 24h, 72h) and metrics (3, 6, 10). Include tests with carry-forward off (`fillMode=none`).
- **Alerts Feed & Commissioning:** Read-heavy workloads to ensure guard refactor doesn’t regress other APIs (baseline 20 req/s).
- **Ingest/Heartbeat:** Background traffic simulating 5k devices @ 30s heartbeat to observe D1 contention while API tests run.

## Tooling
- [k6](https://k6.io/) scripts in `ops/perf/` (to be added) for HTTP load with Cloudflare Access JWT injection.
- SQLite-backed replay harness (existing Vitest integration tests) for deterministic diff checks.
- Datadog dashboards for live latency/error monitoring; Cloudflare Analytics for request outcome validation.

## Ramp Profiles
1. **Smoke:** 1 min @ 10 req/s per telemetry endpoint to verify scripts.
2. **Step Load:** Increase from 25 → 50 → 100 req/s in 5-minute steps, capturing latency and error metrics.
3. **Soak:** 60-minute run @ 100 req/s with background ingest traffic.
4. **Stress:** Burst to 200 req/s for 5 minutes to validate graceful degradation (errors permissible up to 3%).

## Pass/Fail Thresholds
- Pass if latency, throughput, and error rates meet KPIs across smoke/step/soak phases.
- Fail if compare-mode logs exceed `10/min` mismatches or if ingest rate-limit metrics cross warning thresholds (`ops_metrics` route 429 ratio >5%).
- Stress phase acceptable with up to 3% 5xx as long as system auto-recovers within 2 minutes.

## Bottleneck Triage Steps
1. Inspect Datadog + ops metrics for route-specific latency spikes; correlate with D1 query durations.
2. Review worker logs for `telemetry.refactor.shadow_mismatch` and `ingest.*` rate limit warnings.
3. Capture Cloudflare Analytics sampling for 4xx/5xx distribution by colo.
4. If D1 saturates, replay failing queries with `EXPLAIN QUERY PLAN` against staging dataset; evaluate index coverage.
5. Tune request caps, enable caching (KV/Durable Object), or scale ingest token bucket before retrying.

Assumptions • Cloudflare Access tokens available for perf tooling • R2/ingest traffic simulators can run from CI or engineer workstation • Datadog dashboards instrumented prior to tests  
Open Questions • Should we integrate k6 into CI nightly runs or manual pipeline? • What synthetic device distribution best mirrors production? • Do we need SPA Lighthouse perf checks in same plan?  
Risks • Test data setup drift causing false negatives • Access tokens expiring mid-run • Background ingest simulator overloading local environment  
Next 3 Actions • Author k6 scripts with parameterized JWT + payload generators • Provision staging dataset matching target fleet size • Schedule perf rehearsal ahead of telemetry refactor launch
