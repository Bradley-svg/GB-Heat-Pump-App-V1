-- Development seed data for local testing
BEGIN TRANSACTION;

-- Sample devices owned by two demo tenants
INSERT OR IGNORE INTO devices (
  device_id,
  profile_id,
  device_key_hash,
  site,
  firmware,
  map_version,
  online,
  last_seen_at
) VALUES
  (
    'dev-1001',
    'profile-west',
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'Cape Town Plant',
    '1.0.3',
    'gb-map-v1',
    1,
    '2025-01-02T08:55:00.000Z'
  ),
  (
    'dev-1002',
    'profile-east',
    'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    'Johannesburg Warehouse',
    '1.1.0',
    'gb-map-v1',
    0,
    '2025-01-01T16:20:00.000Z'
  );

INSERT OR REPLACE INTO latest_state (
  device_id,
  ts,
  supplyC,
  returnC,
  flowLps,
  compCurrentA,
  powerKW,
  deltaT,
  thermalKW,
  cop,
  cop_quality,
  mode,
  defrost,
  online,
  faults_json,
  payload_json,
  updated_at
) VALUES
  (
    'dev-1001',
    1735804500000,
    45.3,
    39.8,
    0.28,
    10.2,
    1.35,
    5.5,
    4.51,
    3.34,
    'measured',
    'heating',
    0,
    1,
    '[]',
    '{"source":"seed"}',
    '2025-01-02T08:55:00.000Z'
  ),
  (
    'dev-1002',
    1735665600000,
    18.2,
    17.9,
    0.05,
    0.0,
    0.0,
    0.3,
    NULL,
    NULL,
    NULL,
    'idle',
    0,
    0,
    '[]',
    '{"source":"seed"}',
    '2025-01-01T16:20:00.000Z'
  );

-- Alerts seeded for demo dashboards
INSERT OR REPLACE INTO alerts (
  alert_id,
  device_id,
  profile_id,
  alert_type,
  severity,
  status,
  summary,
  description,
  metadata_json,
  acknowledged_at,
  created_at,
  updated_at
) VALUES
  (
    'alert-0001',
    'dev-1001',
    'profile-west',
    'low_flow',
    'warning',
    'open',
    'Low flow rate detected',
    'Flow rate has stayed below the 0.3 L/s threshold for the last 5 minutes.',
    '{"flowLps":0.28,"threshold":0.3}',
    NULL,
    '2025-01-02T08:50:00.000Z',
    '2025-01-02T08:50:00.000Z'
  ),
  (
    'alert-0002',
    'dev-1002',
    'profile-east',
    'offline',
    'critical',
    'acknowledged',
    'Device has gone offline',
    'Device has not reported telemetry for over 6 hours.',
    '{"lastSeen":"2025-01-01T16:20:00.000Z"}',
    '2025-01-02T00:10:00.000Z',
    '2025-01-01T23:45:00.000Z',
    '2025-01-02T00:10:00.000Z'
  );

-- Commissioning runs with checklist payloads
INSERT OR REPLACE INTO commissioning_runs (
  run_id,
  device_id,
  profile_id,
  status,
  started_at,
  completed_at,
  checklist_json,
  notes,
  performed_by,
  report_url,
  created_at,
  updated_at
) VALUES
  (
    'run-0001',
    'dev-1001',
    'profile-west',
    'completed',
    '2025-01-03T07:05:00.000Z',
    '2025-01-03T08:40:00.000Z',
    '["power-on","leak-check","flow-verification","final-signoff"]',
    'Flow needed balancing at step 3 but commissioning passed.',
    'tech.jane@example.com',
    'https://example.com/reports/run-0001.pdf',
    '2025-01-03T07:05:00.000Z',
    '2025-01-03T08:40:00.000Z'
  ),
  (
    'run-0002',
    'dev-1002',
    'profile-east',
    'in_progress',
    '2025-01-05T09:15:00.000Z',
    NULL,
    '["power-on","sensor-calibration"]',
    'Awaiting upstream MQTT mapping before final sign-off.',
    'tech.john@example.com',
    NULL,
    '2025-01-05T09:15:00.000Z',
    '2025-01-05T09:15:00.000Z'
  );

-- Audit trail entries linked to seeded commissioning runs and alerts
INSERT OR REPLACE INTO audit_trail (
  audit_id,
  actor_id,
  actor_email,
  actor_name,
  action,
  entity_type,
  entity_id,
  metadata_json,
  ip_address,
  created_at
) VALUES
  (
    'audit-0001',
    'admin-ops',
    'ops@example.com',
    'Ops Admin',
    'alert.acknowledged',
    'alert',
    'alert-0002',
    '{"status":"acknowledged","acknowledged_at":"2025-01-02T00:10:00.000Z"}',
    '203.0.113.5',
    '2025-01-02T00:11:00.000Z'
  ),
  (
    'audit-0002',
    'tech-jane',
    'tech.jane@example.com',
    'Jane Carter',
    'commissioning.completed',
    'commissioning_run',
    'run-0001',
    '{"status":"completed","report_url":"https://example.com/reports/run-0001.pdf"}',
    '198.51.100.8',
    '2025-01-03T08:45:00.000Z'
  );

-- MQTT topic mappings for demo ingress/egress flows
INSERT OR REPLACE INTO mqtt_mappings (
  mapping_id,
  device_id,
  profile_id,
  topic,
  direction,
  qos,
  transform_json,
  description,
  enabled,
  created_at,
  updated_at
) VALUES
  (
    'mqtt-0001',
    'dev-1001',
    'profile-west',
    'greenbro/dev-1001/telemetry',
    'egress',
    1,
    '{"type":"passthrough"}',
    'Realtime telemetry publish',
    1,
    '2025-01-01T12:00:00.000Z',
    '2025-01-02T12:00:00.000Z'
  ),
  (
    'mqtt-0002',
    NULL,
    'profile-east',
    'greenbro/profile-east/commands',
    'ingress',
    0,
    '{"type":"template","fields":["setpoint","mode"]}',
    'Profile-wide command ingress',
    1,
    '2025-01-04T10:00:00.000Z',
    '2025-01-04T10:00:00.000Z'
  );

COMMIT;

