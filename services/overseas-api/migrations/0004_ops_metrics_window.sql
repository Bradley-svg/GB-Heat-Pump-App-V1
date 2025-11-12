-- Improve ops_metrics query performance for bounded windows and retention

CREATE INDEX IF NOT EXISTS ix_ops_metrics_ts_desc
  ON ops_metrics(ts DESC);

CREATE INDEX IF NOT EXISTS ix_ops_metrics_route_status_ts
  ON ops_metrics(route, status_code, ts DESC);
