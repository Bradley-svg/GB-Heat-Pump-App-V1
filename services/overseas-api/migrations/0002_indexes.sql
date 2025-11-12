-- Performance indexes
CREATE INDEX IF NOT EXISTS ix_telemetry_device_ts ON telemetry(device_id, ts DESC);
CREATE INDEX IF NOT EXISTS ix_latest_state_ts     ON latest_state(ts DESC);

-- Helpful lookups
CREATE INDEX IF NOT EXISTS ix_devices_profile_lastseen ON devices(profile_id, last_seen_at DESC);
