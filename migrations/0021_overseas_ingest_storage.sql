CREATE TABLE IF NOT EXISTS ingest_batches (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingest_batches_profile
  ON ingest_batches(profile_id, received_at DESC);

CREATE TABLE IF NOT EXISTS ingest_heartbeats (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  key_version TEXT NOT NULL,
  heartbeat_ts TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingest_heartbeats_profile
  ON ingest_heartbeats(profile_id, received_at DESC);
