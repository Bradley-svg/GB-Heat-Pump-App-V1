-- Ensure email verification cooldown checks always evaluate the newest token per user.
-- 1) Remove older duplicate rows so future queries are deterministic.
DELETE FROM email_verifications
WHERE rowid IN (
  SELECT rowid
  FROM (
    SELECT rowid,
           ROW_NUMBER() OVER (
             PARTITION BY user_id
             ORDER BY datetime(created_at) DESC, rowid DESC
           ) AS rn
    FROM email_verifications
  )
  WHERE rn > 1
);

-- 2) Add an index so lookups ordered by created_at stay efficient.
CREATE INDEX IF NOT EXISTS ix_email_verifications_user_created_at
  ON email_verifications(user_id, created_at DESC);
