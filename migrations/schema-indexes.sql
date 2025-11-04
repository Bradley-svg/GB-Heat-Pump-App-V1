-- Fast lookups of latest data and time-based queries
CREATE INDEX IF NOT EXISTS ix_latest_state_device ON latest_state(device_id);
CREATE INDEX IF NOT EXISTS ix_latest_state_ts     ON latest_state(ts DESC);

-- Telemetry browsing / future charts
CREATE INDEX IF NOT EXISTS ix_telemetry_device_ts ON telemetry(device_id, ts DESC);

-- Devices housekeeping
CREATE INDEX IF NOT EXISTS ix_devices_last_seen   ON devices(last_seen_at);

-- Alerts triage + commissioning history
CREATE INDEX IF NOT EXISTS ix_alerts_device_status
  ON alerts(device_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_alerts_profile_created
  ON alerts(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_commissioning_device
  ON commissioning_runs(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_commissioning_profile
  ON commissioning_runs(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_commissioning_status
  ON commissioning_runs(status, updated_at DESC);

-- Audit lookups
CREATE INDEX IF NOT EXISTS ix_audit_entity
  ON audit_trail(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_actor
  ON audit_trail(actor_id, created_at DESC);
