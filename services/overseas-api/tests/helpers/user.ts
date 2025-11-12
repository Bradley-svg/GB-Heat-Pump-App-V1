import { randomUUID } from "node:crypto";

import type { Env } from "../../src/env";

export interface SeedUserOptions {
  email?: string;
  roles?: string[];
  clientIds?: string[];
  verified?: boolean;
}

export async function seedTestUser(env: Env, options: SeedUserOptions = {}) {
  const userId = randomUUID();
  const email = (options.email ?? `user-${userId}@example.com`).toLowerCase();
  const roles = JSON.stringify(options.roles ?? ["client"]);
  const clientIds = JSON.stringify(options.clientIds ?? []);
  const now = new Date().toISOString();
  const verifiedAt = options.verified === false ? null : now;

  await env.DB.prepare(
    `INSERT INTO users (
        id, email, password_hash, password_salt, password_iters,
        roles, client_ids, profile_id, created_at, updated_at, verified_at
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8, ?8, ?9)`,
  )
    .bind(userId, email, "test-hash", "test-salt", 100_000, roles, clientIds, now, verifiedAt)
    .run();

  await env.DB.prepare(
    `INSERT INTO user_profiles (user_id, first_name, last_name, phone, company, metadata)
     VALUES (?1, NULL, NULL, NULL, NULL, NULL)`,
  )
    .bind(userId)
    .run();

  return { userId, email };
}
