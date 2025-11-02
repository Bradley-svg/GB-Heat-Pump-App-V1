-- Normalize existing device hashes
UPDATE devices
   SET device_key_hash = LOWER(TRIM(device_key_hash))
 WHERE device_key_hash IS NOT NULL;

UPDATE devices
   SET device_key_hash = NULL
 WHERE device_key_hash IS NOT NULL
   AND (
     LENGTH(device_key_hash) != 64
     OR device_key_hash GLOB '*[^0-9a-f]*'
   );

-- Ensure stored device keys are SHA-256 hex strings
CREATE TRIGGER IF NOT EXISTS trg_devices_require_hash_before_insert
BEFORE INSERT ON devices
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW.device_key_hash IS NULL THEN NULL
      WHEN LENGTH(TRIM(NEW.device_key_hash)) = 64 AND NEW.device_key_hash GLOB '[0-9A-Fa-f]*' THEN NULL
      ELSE RAISE(ABORT, 'device_key_hash must be a 64-character hex string')
    END;
END;

CREATE TRIGGER IF NOT EXISTS trg_devices_require_hash_before_update
BEFORE UPDATE OF device_key_hash ON devices
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW.device_key_hash IS NULL THEN NULL
      WHEN LENGTH(TRIM(NEW.device_key_hash)) = 64 AND NEW.device_key_hash GLOB '[0-9A-Fa-f]*' THEN NULL
      ELSE RAISE(ABORT, 'device_key_hash must be a 64-character hex string')
    END;
END;
