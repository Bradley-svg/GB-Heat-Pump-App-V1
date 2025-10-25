PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  profile_id TEXT,
  site_id TEXT,
  firmware TEXT,
  map_version TEXT,
  online INTEGER DEFAULT 0,
  last_seen_at TEXT,
  device_key_hash TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS latest_state (
  device_id TEXT PRIMARY KEY,
  ts TEXT,
  supplyC REAL,
  returnC REAL,
  tankC REAL,
  ambientC REAL,
  flowLps REAL,
  compCurrentA REAL,
  eevSteps INTEGER,
  powerKW REAL,
  deltaT REAL,
  thermalKW REAL,
  cop REAL,
  cop_quality TEXT,
  mode TEXT,
  defrost INTEGER,
  online INTEGER,
  faults_json TEXT,
  updated_at TEXT,
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS telemetry (
  device_id TEXT,
  ts TEXT,
  metrics_json TEXT,
  deltaT REAL,
  thermalKW REAL,
  cop REAL,
  cop_quality TEXT,
  status_json TEXT,
  faults_json TEXT,
  PRIMARY KEY (device_id, ts),
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alerts (
  alert_id TEXT PRIMARY KEY,
  device_id TEXT,
  type TEXT,
  severity TEXT,
  state TEXT,
  opened_at TEXT,
  closed_at TEXT,
  meta_json TEXT,
  FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ops_metrics (
  ts TEXT,
  route TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  device_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry (ts);
CREATE INDEX IF NOT EXISTS idx_alerts_device_state ON alerts (device_id, state);
