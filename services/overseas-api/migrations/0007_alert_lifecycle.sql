-- Alert lifecycle enhancements: assignment tracking and comment history
ALTER TABLE alerts ADD COLUMN assigned_to TEXT;

CREATE TABLE IF NOT EXISTS alert_comments (
  comment_id    TEXT PRIMARY KEY,
  alert_id      TEXT NOT NULL,
  action        TEXT NOT NULL,
  author_id     TEXT,
  author_email  TEXT,
  body          TEXT,
  metadata_json TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(alert_id) REFERENCES alerts(alert_id)
);

CREATE INDEX IF NOT EXISTS ix_alert_comments_alert_created
  ON alert_comments(alert_id, created_at DESC);
