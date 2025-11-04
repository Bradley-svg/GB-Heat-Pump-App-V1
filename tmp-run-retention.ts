import { runTelemetryRetention } from "./src/jobs/retention";
import { createWorkerEnv } from "./tests/helpers/worker-env";
import { createMockR2Bucket } from "./tests/helpers/mock-r2";

async function main() {
  const now = new Date("2025-11-03T00:00:00Z");
  const archive = createMockR2Bucket();
  const { env, dispose } = await createWorkerEnv({
    TELEMETRY_RETENTION_DAYS: "90",
    RETENTION_ARCHIVE: archive.bucket,
    RETENTION_BACKUP_PREFIX: "retention-tests",
  });

  const oldMs = now.getTime() - 120 * 24 * 60 * 60 * 1000;
  const oldIso = new Date(oldMs).toISOString();

  await env.DB.prepare(
    `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
       VALUES ('dev-dry', ?1, '{"metric":1}', NULL, NULL, NULL, NULL, '[]', '[]')`
  )
    .bind(oldMs)
    .run();

  await env.DB.prepare(
    `INSERT INTO mqtt_webhook_messages (
        message_id, topic, payload_json, qos, retain, properties_json, mapping_id, profile_id, actor_email, received_at, inserted_at
     ) VALUES ('msg-dry', 'topic', '{"m":1}', 0, 0, NULL, NULL, NULL, NULL, ?1, ?1)`
  )
    .bind(oldIso)
    .run();

  await env.DB.prepare(
    `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id)
     VALUES (?1, '/dry-run', 200, 10, NULL)`
  )
    .bind(oldIso)
    .run();

  console.log("== Dry run ==");
  await runTelemetryRetention(env, { now, dryRun: true });
  console.log("== Archive keys after dry run ==", archive.listKeys());

  console.log("== Real run ==");
  await runTelemetryRetention(env, { now });
  console.log("== Archive keys after real run ==", archive.listKeys());

  dispose();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
