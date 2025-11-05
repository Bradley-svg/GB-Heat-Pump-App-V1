import type { Env } from "../env";
import { nowISO } from "../utils";

const UPSERT_CURSOR_SQL = `
INSERT INTO cron_cursors (name, cursor, updated_at)
VALUES (?1, ?2, ?3)
ON CONFLICT(name) DO UPDATE SET
  cursor = excluded.cursor,
  updated_at = excluded.updated_at
`;

export async function readCronCursor(env: Env, name: string): Promise<string | null> {
  const row = await env.DB
    .prepare(`SELECT cursor FROM cron_cursors WHERE name = ?1 LIMIT 1`)
    .bind(name)
    .first<{ cursor: string | null }>();
  return row?.cursor ?? null;
}

export async function writeCronCursor(env: Env, name: string, cursor: string | number): Promise<void> {
  const cursorValue = typeof cursor === "number" ? String(Math.floor(cursor)) : String(cursor);
  await env.DB.prepare(UPSERT_CURSOR_SQL).bind(name, cursorValue, nowISO()).run();
}

export async function clearCronCursor(env: Env, name: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM cron_cursors WHERE name = ?1`).bind(name).run();
}

