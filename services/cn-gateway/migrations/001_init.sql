CREATE TABLE IF NOT EXISTS mapping (
  device_id_raw TEXT PRIMARY KEY,
  did_pseudo TEXT NOT NULL UNIQUE,
  key_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  collision_counter INT NOT NULL DEFAULT 0,
  CHECK (char_length(did_pseudo) BETWEEN 22 AND 24)
);

CREATE INDEX IF NOT EXISTS idx_mapping_pseudo ON mapping (did_pseudo);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL,
  ip_hmac TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_time ON audit_log (occurred_at);

CREATE TABLE IF NOT EXISTS export_log (
  id BIGSERIAL PRIMARY KEY,
  batch_id TEXT NOT NULL,
  record_count INT NOT NULL,
  status TEXT NOT NULL,
  transmitted_at TIMESTAMPTZ NOT NULL,
  response_code INT NOT NULL,
  checksum TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_export_log_batch ON export_log (batch_id);

CREATE TABLE IF NOT EXISTS errors (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_id_raw TEXT,
  seq INT,
  error_code TEXT NOT NULL,
  payload JSONB,
  resolved BOOLEAN NOT NULL DEFAULT FALSE
);
