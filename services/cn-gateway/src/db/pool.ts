import { Pool, type PoolClient } from "pg";
import { config } from "../config.js";
import { logger } from "../logging.js";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) {
    return pool;
  }
  pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    ssl: config.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
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
