CREATE TABLE IF NOT EXISTS email_verification_cooldowns (
  user_id TEXT PRIMARY KEY,
  last_sent_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
