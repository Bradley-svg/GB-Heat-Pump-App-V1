-- Track recently accepted telemetry payloads to prevent duplicate ingestion
CREATE TABLE IF NOT EXISTS ingest_nonces (
  device_id TEXT NOT NULL,
  ts_ms INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (device_id, ts_ms)
);

CREATE INDEX IF NOT EXISTS idx_ingest_nonces_expires_at
  ON ingest_nonces (expires_at);
