#!/usr/bin/env node
/**
 * Run the standard D1 sanity queries we use after seeding data.
 * Defaults to the remote database configured in wrangler.toml, but you can pass
 * --local to target a local Miniflare instance instead.
 *
 * Usage:
 *   node ./scripts/db-sanity-check.mjs            # remote
 *   node ./scripts/db-sanity-check.mjs --local    # local dev database
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dbName = process.env.D1_DB_NAME ?? 'GREENBRO_DB';
const args = process.argv.slice(2);
const useLocal = args.includes('--local');
const flag = useLocal ? '--local' : '--remote';

const queries = [
  {
    label: 'Devices (seeded)',
    sql: "SELECT device_id, profile_id, online FROM devices WHERE device_id IN ('dev-1001', 'dev-1002') ORDER BY device_id;"
  },
  {
    label: 'Alerts by device',
    sql: "SELECT alert_id, device_id, profile_id, severity, status, created_at FROM alerts WHERE device_id IN ('dev-1001', 'dev-1002') ORDER BY alert_id;"
  },
  {
    label: 'Commissioning runs by device',
    sql: "SELECT run_id, device_id, profile_id, status, started_at, completed_at FROM commissioning_runs WHERE device_id IN ('dev-1001', 'dev-1002') ORDER BY run_id;"
  },
  {
    label: 'Audit trail for alerts + commissioning',
    sql: "SELECT audit_id, action, entity_type, entity_id, actor_email, created_at FROM audit_trail WHERE entity_id IN ('alert-0002', 'run-0001') ORDER BY created_at;"
  },
  {
    label: 'Latest state snapshots',
    sql: "SELECT device_id, ts, powerKW, cop, mode, updated_at FROM latest_state WHERE device_id IN ('dev-1001', 'dev-1002') ORDER BY device_id;"
  },
  {
    label: 'MQTT mappings',
    sql: "SELECT mapping_id, device_id, profile_id, topic, direction, enabled FROM mqtt_mappings WHERE mapping_id IN ('mqtt-0001', 'mqtt-0002') ORDER BY mapping_id;"
  }
];

const tempDir = mkdtempSync(join(tmpdir(), 'gb-d1-sanity-'));

try {
  queries.forEach(({ label, sql }, index) => {
    console.log(`\n=== ${label} ===`);
    const queryFile = join(tempDir, `query-${index}.sql`);
    writeFileSync(queryFile, `${sql}\n`, 'utf8');

    const normalizedPath = queryFile.replace(/\\/g, '/');
    const command = `npx wrangler d1 execute ${dbName} ${flag} --file "${normalizedPath}"`;
    const result = spawnSync(command, { stdio: 'inherit', shell: true });
    if (result.status !== 0) {
      const exitCode = result.status ?? 1;
      if (result.error) {
        console.error(`\nQuery "${label}" failed: ${result.error.message}`);
      }
      console.error(`\nQuery "${label}" failed with exit code ${exitCode}.`);
      process.exit(exitCode);
    }

    rmSync(queryFile);
  });

  console.log('\nSanity checks completed successfully.');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
