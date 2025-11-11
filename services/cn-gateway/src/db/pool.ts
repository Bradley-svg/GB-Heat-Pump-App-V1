import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import { config } from "../config.js";
import { logger } from "../logging.js";

let pool: Pool | null = null;

function buildSslConfig() {
  if (config.NODE_ENV === "development" || config.NODE_ENV === "test") {
    return undefined;
  }

  const caPath = process.env.PGSSLROOTCERT?.trim();
  let ca: string | undefined;
  if (caPath) {
    try {
      ca = readFileSync(caPath, "utf8");
    } catch (error) {
      logger.warn({ error, caPath }, "Failed to read PGSSLROOTCERT; falling back to system CA");
    }
  }

  return {
    rejectUnauthorized: true,
    ca
  };
}

export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    ssl: buildSslConfig()
  });

  pool.on("error", (err) => {
    logger.error({ err }, "Unexpected Postgres error");
  });
  return pool;
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
