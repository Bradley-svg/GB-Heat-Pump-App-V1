-- Create the mobile-e2e test user (read-only "client" role)
INSERT INTO users (
  id,
  email,
  password_hash,
  password_salt,
  password_iters,
  roles,
  client_ids,
  profile_id,
  created_at,
  updated_at,
  verified_at
)
VALUES (
  '6f833ff0-8de7-44ab-9d38-516cfa4b8b99',
  'mobile-e2e@greenbro.com',
  'M/DBQq0KxTnNdn/T/iF0/1kn6Xqy5sqMPFaInuKJNxw=',
  '4JJa+2PBH464NPM/AJzCOA==',
  120000,
  '["client"]',
  '[]',
  NULL,
  datetime('now'),
  datetime('now'),
  datetime('now')
);

INSERT INTO user_profiles (
  user_id,
  first_name,
  last_name,
  phone,
  company,
  metadata
)
VALUES (
  '6f833ff0-8de7-44ab-9d38-516cfa4b8b99',
  'Mobile',
  'E2E',
  NULL,
  'Automation',
  json_object('source', 'detox')
);
