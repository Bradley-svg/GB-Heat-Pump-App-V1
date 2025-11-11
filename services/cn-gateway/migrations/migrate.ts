import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getPool } from "../src/db/pool.js";
import { logger } from "../src/logging.js";

async function run() {
  const pool = getPool();
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const migrationPath = join(currentDir, "001_init.sql");
  const statement = await readFile(migrationPath, "utf8");
  await pool.query(statement);
  await pool.end();
  logger.info("Migrations applied");
}

run().catch((err) => {
  logger.error({ err }, "Migration failed");
  process.exit(1);
});
