import type { PoolClient } from "pg";
import { appendCollisionSuffix } from "../crypto/pseudo.js";
import { getPool } from "./pool.js";

export interface MappingRecord {
  device_id_raw: string;
  did_pseudo: string;
  key_version: string;
  collision_counter: number;
  created_at: Date;
  last_seen: Date;
}

const UNIQUE_VIOLATION = "23505";

async function insertRecord(
  client: PoolClient,
  deviceIdRaw: string,
  didPseudo: string,
  keyVersion: string,
  collisionCounter: number
): Promise<MappingRecord> {
  const result = await client.query<MappingRecord>(
    `INSERT INTO mapping (device_id_raw, did_pseudo, key_version, collision_counter)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (device_id_raw)
     DO UPDATE SET last_seen = now(), key_version = excluded.key_version
     RETURNING *`,
    [deviceIdRaw, didPseudo, keyVersion, collisionCounter]
  );
  return result.rows[0];
}

export async function persistMapping(
  deviceIdRaw: string,
  basePseudo: string,
  keyVersion: string,
  clientParam?: PoolClient
): Promise<MappingRecord> {
  const client = clientParam ?? (await getPool().connect());
  let release = false;
  if (!clientParam) {
    release = true;
  }
  try {
    let counter = 0;
    while (counter < 1024) {
      const candidate = counter === 0 ? basePseudo : appendCollisionSuffix(basePseudo, counter);
      try {
        return await insertRecord(client, deviceIdRaw, candidate, keyVersion, counter);
      } catch (err) {
        if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
          counter += 1;
          continue;
        }
        throw err;
      }
    }
    throw new Error("Exceeded collision retries for did_pseudo");
  } finally {
    if (release) {
      client.release();
    }
  }
}

export async function touchMapping(deviceIdRaw: string): Promise<void> {
  await getPool().query("UPDATE mapping SET last_seen = now() WHERE device_id_raw = $1", [deviceIdRaw]);
}
