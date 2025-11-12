# Release Notes

## 2025-11-03

- Added covering index `ix_ops_metrics_device_route_ts` via `migrations/0010_ops_metrics_device_route_index.sql` so ingest/heartbeat rate-limit lookups stay on the indexed path.
- Reordered rate-limit query predicates (`device_id`, `route`, `ts`) to align with the new covering index; verified with `EXPLAIN QUERY PLAN` that the Worker now uses the index.
- Deployments must leave the `Apply D1 migrations` step enabled in the `Worker Deploy` GitHub Action (or run `pnpm run migrate:apply` manually) before shifting traffic to ensure the index exists in production.
