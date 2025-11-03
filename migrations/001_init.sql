-- Devices (tenant-owned: profile_id)
CREATE TABLE IF NOT EXISTS devices (
  device_id        TEXT PRIMARY KEY,
  profile_id       TEXT,                        -- tenant/org id
  device_key_hash  TEXT,                        -- SHA-256 of device key
  site             TEXT,
  firmware         TEXT,
  map_version      TEXT,
  online           INTEGER DEFAULT 0,
  last_seen_at     TEXT
);

-- Latest state (one row per device)
CREATE TABLE IF NOT EXISTS latest_state (
  device_id    TEXT PRIMARY KEY,
  ts           INTEGER NOT NULL,                -- epoch ms
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
  faults_json  TEXT,
  payload_json TEXT,                            -- optional heartbeat payloads
  updated_at   TEXT
);

-- Telemetry history
CREATE TABLE IF NOT EXISTS telemetry (
  device_id     TEXT NOT NULL,
  ts            INTEGER NOT NULL,               -- epoch ms
  metrics_json  TEXT NOT NULL,
  deltaT        REAL,
  thermalKW     REAL,
  cop           REAL,
  cop_quality   TEXT,
  status_json   TEXT,
  faults_json   TEXT,
  PRIMARY KEY(device_id, ts)
);

-- Ops metrics (best-effort, small volume)
CREATE TABLE IF NOT EXISTS ops_metrics (
  ts           TEXT NOT NULL,
  route        TEXT NOT NULL,
  status_code  INTEGER NOT NULL,
  duration_ms  INTEGER NOT NULL,
  device_id    TEXT
);
