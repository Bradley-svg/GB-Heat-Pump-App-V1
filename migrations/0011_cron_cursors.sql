CREATE TABLE IF NOT EXISTS cron_cursors (
  name TEXT PRIMARY KEY,
  cursor TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cron_cursors_updated_at
  ON cron_cursors(updated_at);

