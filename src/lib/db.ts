import type { Env } from "../env";
import { systemLogger } from "../utils/logging";

let foreignKeysEnabled = false;

async function enableForeignKeys(db: Env["DB"]) {
  if (foreignKeysEnabled) return;
  try {
    await db.prepare("PRAGMA foreign_keys = ON").run();
    foreignKeysEnabled = true;
  } catch (error) {
    systemLogger({ scope: "db" }).warn("db.enable_foreign_keys_failed", { error });
  }
}

export async function withTransaction<T>(
  db: Env["DB"],
  work: () => Promise<T>,
): Promise<T> {
  await enableForeignKeys(db);
  await db.prepare("BEGIN IMMEDIATE").run();
  try {
    const result = await work();
    await db.prepare("COMMIT").run();
    return result;
  } catch (error) {
    try {
      await db.prepare("ROLLBACK").run();
    } catch (rollbackError) {
      systemLogger({ scope: "db" }).error("db.transaction_rollback_failed", {
        error: rollbackError,
        original_error: error,
      });
    }
    throw error;
  }
}
