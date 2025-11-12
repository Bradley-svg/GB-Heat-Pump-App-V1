import type { Env } from "../env";
import { hashUserEmailForStorage } from "../lib/client-events";
import { systemLogger, type Logger } from "../utils/logging";

export const CLIENT_EVENT_BACKFILL_CRON = "45 2 * * *";
export const CLIENT_EVENT_BACKFILL_LIMIT = 250;

type BackfillRow = { id: string; user_email: string };

export type ClientEventBackfillResult = {
  status: "ok" | "complete";
  processed: number;
  updated: number;
  has_more: boolean;
};

export async function runClientEventsBackfill(
  env: Env,
  options: { logger?: Logger } = {},
): Promise<ClientEventBackfillResult> {
  const secret = typeof env.CLIENT_EVENT_TOKEN_SECRET === "string" ? env.CLIENT_EVENT_TOKEN_SECRET.trim() : "";
  if (!secret) {
    throw new Error("CLIENT_EVENT_TOKEN_SECRET not configured");
  }

  const log = options.logger ?? systemLogger({ task: "client-events-backfill" });

  const pending = await env.DB.prepare(
    `SELECT id, user_email
       FROM client_events
      WHERE user_email IS NOT NULL
        AND user_email NOT LIKE 'sha256:%'
      LIMIT ?`,
  )
    .bind(CLIENT_EVENT_BACKFILL_LIMIT)
    .all<BackfillRow>();

  const rows = pending.results ?? [];
  if (!rows.length) {
    log.info("client_events.backfill_complete", { processed: 0, updated: 0 });
    return {
      status: "complete",
      processed: 0,
      updated: 0,
      has_more: false,
    };
  }

  let updated = 0;
  const update = env.DB.prepare(`UPDATE client_events SET user_email = ? WHERE id = ?`);
  for (const row of rows) {
    const hashed = await hashUserEmailForStorage(row.user_email, secret);
    if (!hashed) continue;
    await update.bind(hashed, row.id).run();
    updated += 1;
  }

  const hasMore = rows.length === CLIENT_EVENT_BACKFILL_LIMIT;
  log.info("client_events.backfill_run", { processed: rows.length, updated, has_more: hasMore });
  return {
    status: hasMore ? "ok" : "complete",
    processed: rows.length,
    updated,
    has_more: hasMore,
  };
}
