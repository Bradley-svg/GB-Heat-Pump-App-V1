CREATE TABLE IF NOT EXISTS mqtt_webhook_messages (
  message_id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  qos INTEGER NOT NULL DEFAULT 0 CHECK (qos IN (0, 1, 2)),
  retain INTEGER NOT NULL DEFAULT 0 CHECK (retain IN (0, 1)),
  properties_json TEXT,
  mapping_id TEXT,
  profile_id TEXT,
  actor_email TEXT,
  received_at TEXT NOT NULL,
  inserted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_mqtt_webhook_topic
  ON mqtt_webhook_messages(topic);

CREATE INDEX IF NOT EXISTS ix_mqtt_webhook_inserted
  ON mqtt_webhook_messages(inserted_at DESC);
