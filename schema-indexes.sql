-- Fast lookups of latest data and time-based queries
CREATE INDEX IF NOT EXISTS ix_latest_state_device ON latest_state(device_id);
CREATE INDEX IF NOT EXISTS ix_latest_state_ts     ON latest_state(ts DESC);

-- Telemetry browsing / future charts
CREATE INDEX IF NOT EXISTS ix_telemetry_device_ts ON telemetry(device_id, ts DESC);

-- Devices housekeeping
CREATE INDEX IF NOT EXISTS ix_devices_last_seen   ON devices(last_seen_at);
