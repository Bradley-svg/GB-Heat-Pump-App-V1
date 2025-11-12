CREATE TABLE IF NOT EXISTS client_events (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  event TEXT NOT NULL,
  source TEXT,
  user_email TEXT,
  dimension TEXT,
  properties TEXT
);

CREATE INDEX IF NOT EXISTS idx_client_events_event_created
  ON client_events(event, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_events_dimension_created
  ON client_events(event, dimension, created_at DESC);

