import type { Env } from "../../env";
import { nowISO } from "../../utils";
import { generateToken, hashToken } from "./sessions";

const EMAIL_VERIFICATION_TTL_HOURS = 24;

export type EmailVerificationResult =
  | {
      ok: true;
      userId: string;
    }
  | {
      ok: false;
      reason: "invalid" | "expired" | "used";
    };

export async function issueEmailVerification(env: Env, userId: string): Promise<{ token: string; expiresAt: string }> {
  const token = generateToken(48);
  const tokenHash = await hashToken(token);
  const createdAt = nowISO();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(`DELETE FROM email_verifications WHERE user_id = ?1`).bind(userId).run();

  await env.DB.prepare(
    `INSERT OR REPLACE INTO email_verifications (token_hash, user_id, created_at, expires_at, used_at)
     VALUES (?1, ?2, ?3, ?4, NULL)`,
  )
    .bind(tokenHash, userId, createdAt, expiresAt)
    .run();

  return { token, expiresAt };
}

export async function consumeEmailVerification(env: Env, token: string): Promise<EmailVerificationResult> {
  const tokenHash = await hashToken(token);
  const row = await env.DB
    .prepare(
      `SELECT token_hash, user_id, expires_at, used_at
         FROM email_verifications
        WHERE token_hash = ?1`,
    )
    .bind(tokenHash)
    .first<{ token_hash: string; user_id: string; expires_at: string; used_at: string | null }>();

  if (!row) {
    return { ok: false, reason: "invalid" };
  }
  if (row.used_at) {
    return { ok: false, reason: "used" };
  }
  if (Date.parse(row.expires_at) <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  await env.DB
    .prepare(`UPDATE email_verifications SET used_at = ?2 WHERE token_hash = ?1`)
    .bind(tokenHash, nowISO())
    .run();

  return { ok: true, userId: row.user_id };
}
