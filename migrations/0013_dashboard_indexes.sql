-- Additional indexes supporting fleet and archive dashboards
CREATE INDEX IF NOT EXISTS ix_devices_profile_online_last_seen
  ON devices(profile_id, online, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS ix_telemetry_ts
  ON telemetry(ts DESC);
