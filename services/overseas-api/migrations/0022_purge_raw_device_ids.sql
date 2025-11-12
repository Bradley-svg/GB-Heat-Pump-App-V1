-- Purge legacy raw identifiers from Mode A tables. This drops existing telemetry/metadata so that
-- only pseudonymous records ingested via the CN gateway remain.
DELETE FROM telemetry;
DELETE FROM latest_state;
DELETE FROM ingest_batches;
DELETE FROM ingest_heartbeats;
DELETE FROM ops_metrics;
DELETE FROM devices;
