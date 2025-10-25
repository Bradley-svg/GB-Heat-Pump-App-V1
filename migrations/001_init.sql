-- Devices and telemetry core
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  profile_id TEXT,
  site_id TEXT,
  firmware TEXT,
  map_version TEXT,
  online INTEGER DEFAULT 0,
  last_seen_at TEXT,
  device_key_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS latest_state (
  device_id TEXT PRIMARY KEY,
  ts INTEGER,
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
  cop_quality TEXT, -- 'measured' | 'estimated' | NULL
  mode TEXT,
  defrost INTEGER,
  online INTEGER,
  faults_json TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS telemetry (
  device_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  metrics_json TEXT NOT NULL,
  deltaT REAL,
  thermalKW REAL,
  cop REAL,
  cop_quality TEXT,
  status_json TEXT,
  faults_json TEXT,
  PRIMARY KEY (device_id, ts)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry (ts);

-- Alerts (placeholders for later rules engine)
CREATE TABLE IF NOT EXISTS alerts (
  alert_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT,
  state TEXT,              -- 'open' | 'ack' | 'closed'
  opened_at TEXT,
  closed_at TEXT,
  meta_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_alerts_device_state ON alerts (device_id, state);

-- Ops metrics (for SLOs)
CREATE TABLE IF NOT EXISTS ops_metrics (
  ts TEXT NOT NULL,
  route TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER,
  device_id TEXT
);
