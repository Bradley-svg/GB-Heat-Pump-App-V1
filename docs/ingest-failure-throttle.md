# Ingest Failure Throttle - Follow Up Topics

## Background

- The worker enforces a per-device failure guardrail for telemetry ingest and heartbeat via `INGEST_FAILURE_LIMIT_PER_MIN`.
- Failure counts are pulled from `ops_metrics` before device-key verification so obviously unhealthy sources are short-circuited.
- Setting `INGEST_FAILURE_LIMIT_PER_MIN = 0` now disables the guardrail. When unset, the fallback is half the success limit (with a minimum of 10).

## Confirmations Needed

1. **Disable semantics**  
   - With success throttling disabled (`INGEST_RATE_LIMIT_PER_MIN = 0`), the failure guard now stays disabled as well. Confirm this matches expectations for all environments.
   - When success throttling is active, do we still want the default floor of `max(10, floor(success / 2))`, or should we tune this per device class?

2. **Trusted sources / whitelists**  
   - Do we need an allowlist (per profile, firmware build, or IP range) where failure counts are ignored?
   - Current code blocks repeated 4xx/5xx traffic regardless of provenance.

3. **Threshold tuning**  
   - Are there bursty retry patterns (for example firmware backoffs) that require a higher ceiling or a longer rolling window?
   - Should contractor test rigs receive a higher failure quota than production units?

4. **Unknown device traffic**  
   - Because failure counting happens before we look up the device, spoofed IDs could still deplete the bucket. Do we want a separate quota for unknown or unauthenticated devices?

## Discussion Inputs

- Gather recent failure metrics (count by route/status) once the guardrail ships.
- Walk through replay/dedup behaviour so product understands why the fallback exists.
- Confirm firmware retry strategies (fixed vs exponential) so quotas align with reality.

