INSERT INTO devices (
  device_id,
  profile_id,
  device_key_hash,
  firmware,
  map_version,
  online,
  last_seen_at
) VALUES (
  'GB-HP-FACTORY-01',
  'profile-factory',
  '39363e4648801ff2cee1edb791109fe206fc5caa2ebd98e6339c4399a18231a5',
  '1.0.0-factory',
  'gb-map-v1',
  0,
  NULL
) ON CONFLICT(device_id) DO UPDATE SET
  profile_id=excluded.profile_id,
  device_key_hash=excluded.device_key_hash,
  firmware=excluded.firmware,
  map_version=excluded.map_version,
  online=excluded.online,
  last_seen_at=excluded.last_seen_at;
