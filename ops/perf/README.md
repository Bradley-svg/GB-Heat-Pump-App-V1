# k6 Smoke Harness

This harness provides a repeatable performance smoke aligned with the **Prompt Bible #24 – Performance Test Plan** checklist. It lives under `ops/perf/` so both CI and scheduled runs can reuse the same assets.

## Script overview

| File | Purpose |
| --- | --- |
| `smoke.js` | k6 script that exercises `GET /health` with lightweight concurrency to validate the worker is online and under the P95 < 500 ms KPI. |

The script exports k6 thresholds plus a custom `gb_perf_health_latency` trend for dashboards.

## Running locally

You need either Docker (`grafana/k6`) or a local `k6` binary.

```bash
# Using Docker (recommended)
docker run --rm -i \
  -e K6_BASE_URL="http://127.0.0.1:8787" \
  -e K6_VUS=2 \
  -e K6_DURATION=30s \
  -v "$PWD":/work -w /work \
  grafana/k6 run ops/perf/smoke.js

# Using a local k6 binary
k6 run ops/perf/smoke.js --env K6_BASE_URL=http://127.0.0.1:8787 --env K6_VUS=2 --env K6_DURATION=30s
```

Optional: supply `K6_ACCESS_JWT` when hitting Access-protected endpoints.

## CI integration

See `.github/workflows/perf-smoke.yml`. The workflow uses `grafana/k6-action` to:

1. Run on `main`, nightly at 06:00 UTC, and via manual dispatch.
2. Read `PERF_BASE_URL` (repository variable/secret) and optional `PERF_ACCESS_JWT`.
3. Upload the k6 summary as an artifact for audit.

The job is intentionally lightweight (default `vus=1`, `duration=45s`) to catch regressions without saturating production. Adjust `K6_VUS`/`K6_DURATION` via workflow inputs when running heavier rehearsals.

## Next steps

- Extend the script to cover `/metrics?format=json` once Access automation supplies JWTs in CI.
- Feed `gb_perf_health_latency` into Grafana or Datadog dashboards alongside the thresholds from `docs/performance-test-plan.md`.
- Gate telemetry feature rollouts by comparing smoke run history (Prompt Bible Appendix C Definition of Done).

