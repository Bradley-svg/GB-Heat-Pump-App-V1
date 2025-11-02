-- Keep rate-limit lookups fast for ops_metrics

CREATE INDEX IF NOT EXISTS ix_ops_metrics_route_device_ts
  ON ops_metrics(route, device_id, ts DESC);
