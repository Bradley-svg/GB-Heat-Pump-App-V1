INSERT INTO client_events (id, created_at, event, source, user_email, dimension, properties)
SELECT lower(hex(randomblob(16))) AS id,
       COALESCE(u.verified_at, u.created_at, datetime('now')) AS created_at,
       'signup_flow.result' AS event,
       'backfill' AS source,
       email AS user_email,
       CASE WHEN verified_at IS NOT NULL THEN 'authenticated' ELSE 'pending_verification' END AS dimension,
       json_object('backfill', 1) AS properties
  FROM users AS u
  LEFT JOIN client_events AS existing
         ON existing.event = 'signup_flow.result'
        AND existing.user_email = u.email
 WHERE existing.id IS NULL;
