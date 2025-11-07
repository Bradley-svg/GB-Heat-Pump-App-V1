-- Enforce foreign key constraints across device-scoped tables.

PRAGMA foreign_keys = OFF;

-- Cleanup orphaned rows before re-creating tables with constraints.
DELETE FROM latest_state WHERE device_id NOT IN (SELECT device_id FROM devices);
DELETE FROM telemetry WHERE device_id NOT IN (SELECT device_id FROM devices);
DELETE FROM commissioning_runs WHERE device_id NOT IN (SELECT device_id FROM devices);
DELETE FROM ingest_nonces WHERE device_id NOT IN (SELECT device_id FROM devices);

-- Rebuild latest_state with a cascading foreign key.
CREATE TABLE latest_state_new (
  device_id    TEXT PRIMARY KEY,
  ts           INTEGER NOT NULL,
  supplyC      REAL,
  returnC      REAL,
  tankC        REAL,
  ambientC     REAL,
  flowLps      REAL,
  compCurrentA REAL,
  eevSteps     REAL,
  powerKW      REAL,
  deltaT       REAL,
  thermalKW    REAL,
  cop          REAL,
  cop_quality  TEXT,
  mode         TEXT,
  defrost      REAL,
  online       INTEGER DEFAULT 0,
  payload_json TEXT,
  faults_json  TEXT,
  updated_at   TEXT,
  FOREIGN KEY(device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);
INSERT INTO latest_state_new (
  device_id, ts, supplyC, returnC, tankC, ambientC, flowLps, compCurrentA, eevSteps, powerKW,
  deltaT, thermalKW, cop, cop_quality, mode, defrost, online, payload_json, faults_json, updated_at
)
SELECT
  device_id, ts, supplyC, returnC, tankC, ambientC, flowLps, compCurrentA, eevSteps, powerKW,
  deltaT, thermalKW, cop, cop_quality, mode, defrost, online, payload_json, faults_json, updated_at
FROM latest_state;
DROP TABLE latest_state;
ALTER TABLE latest_state_new RENAME TO latest_state;

-- Rebuild telemetry with a cascading foreign key.
CREATE TABLE telemetry_new (
  device_id     TEXT NOT NULL,
  ts            INTEGER NOT NULL,
  metrics_json  TEXT NOT NULL,
  deltaT        REAL,
  thermalKW     REAL,
  cop           REAL,
  cop_quality   TEXT,
  status_json   TEXT,
  faults_json   TEXT,
  PRIMARY KEY(device_id, ts),
  FOREIGN KEY(device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);
INSERT INTO telemetry_new (
  device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json
)
SELECT
  device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json
FROM telemetry;
DROP TABLE telemetry;
ALTER TABLE telemetry_new RENAME TO telemetry;

-- Rebuild commissioning_runs with cascading device cleanup.
CREATE TABLE commissioning_runs_new (
  run_id         TEXT PRIMARY KEY,
  device_id      TEXT NOT NULL,
  profile_id     TEXT,
  status         TEXT NOT NULL DEFAULT 'draft',
  started_at     TEXT NOT NULL,
  completed_at   TEXT,
  checklist_json TEXT,
  notes          TEXT,
  performed_by   TEXT,
  report_url     TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  FOREIGN KEY(device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);
INSERT INTO commissioning_runs_new (
  run_id, device_id, profile_id, status, started_at, completed_at,
  checklist_json, notes, performed_by, report_url, created_at, updated_at
)
SELECT
  run_id, device_id, profile_id, status, started_at, completed_at,
  checklist_json, notes, performed_by, report_url, created_at, updated_at
FROM commissioning_runs;
DROP TABLE commissioning_runs;
ALTER TABLE commissioning_runs_new RENAME TO commissioning_runs;

-- Rebuild ingest_nonces with cascading cleanup.
CREATE TABLE ingest_nonces_new (
  device_id TEXT NOT NULL,
  ts_ms INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (device_id, ts_ms),
  FOREIGN KEY(device_id) REFERENCES devices(device_id) ON DELETE CASCADE
);
INSERT INTO ingest_nonces_new (device_id, ts_ms, expires_at, created_at)
SELECT device_id, ts_ms, expires_at, created_at FROM ingest_nonces;
DROP TABLE ingest_nonces;
ALTER TABLE ingest_nonces_new RENAME TO ingest_nonces;

PRAGMA foreign_keys = ON;

-- Re-create indexes lost during table rebuilds.
CREATE INDEX IF NOT EXISTS ix_latest_state_device ON latest_state(device_id);
CREATE INDEX IF NOT EXISTS ix_latest_state_ts ON latest_state(ts DESC);
CREATE INDEX IF NOT EXISTS ix_telemetry_device_ts ON telemetry(device_id, ts DESC);
CREATE INDEX IF NOT EXISTS ix_commissioning_device ON commissioning_runs(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_commissioning_profile ON commissioning_runs(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_commissioning_status ON commissioning_runs(status, updated_at DESC);
