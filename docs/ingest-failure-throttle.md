# Ingest Failure Throttle – Open Questions

## Background

- The Worker now enforces a per-device failure guardrail for telemetry ingest and heartbeat (`INGEST_FAILURE_LIMIT_PER_MIN`).
- Failures are counted via `ops_metrics` before device-key verification so we can short-circuit obviously unhealthy sources.
- Default fallback is half the success limit (or `60` when success limit is disabled).

## Questions for Product / Firmware

1. **Disable semantics**  
   - If `INGEST_RATE_LIMIT_PER_MIN = 0` (meaning “no throttling”), should the failure guard be disabled as well?  
   - Current fallback (`overallLimit > 0 ? floor(overall/2) : 60`) will still throttle at 60/min when the success limit is disabled. Confirm desired behaviour.

2. **Whitelist / trusted sources**  
   - Do we need a whitelist (per device profile or IP range) where failures are ignored?  
   - Current implementation will throttle any repeated 4xx/5xx regardless of provenance.

3. **Threshold tuning**  
   - Is “half of success limit” appropriate for all device classes?  
   - Are there known bursty retry patterns that would justify a higher failure ceiling or a longer window?

4. **Unknown device traffic**  
   - Because the failure check runs before device lookup, spoofed IDs could rate-limit real devices. Should we move the failure counting after the device check or apply separate limits for unknown devices/IP addresses?

## Suggested Discussion Inputs

- Provide recent ingest failure metrics (count by route/status) once we deploy.
- Walk through replay/dedup behaviour so product understands the fallback logic.
- Bring firmware team to confirm retry strategy (exponential backoff vs fixed rate).

