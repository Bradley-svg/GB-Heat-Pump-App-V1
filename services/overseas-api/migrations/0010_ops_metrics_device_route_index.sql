-- Align ops_metrics rate-limit lookup with device-centric access pattern

DROP INDEX IF EXISTS ix_ops_metrics_route_device_ts;

CREATE INDEX IF NOT EXISTS ix_ops_metrics_device_route_ts
  ON ops_metrics(device_id, route, ts DESC);
