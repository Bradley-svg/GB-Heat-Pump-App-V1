CREATE TABLE IF NOT EXISTS cache_tokens (
  cache_area TEXT NOT NULL,
  cache_scope TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cache_area, cache_scope)
);

CREATE INDEX IF NOT EXISTS ix_cache_tokens_area_scope
  ON cache_tokens(cache_area, cache_scope);
