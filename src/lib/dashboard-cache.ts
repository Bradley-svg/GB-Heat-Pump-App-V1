import type { Env } from "../env";
import { nowISO } from "../utils";
import { deleteCacheKey } from "./cache";

export const DASHBOARD_CACHE_AREA = {
  clientCompact: "client-compact",
  archiveOffline: "archive-offline",
} as const;

export const DASHBOARD_ADMIN_SCOPE = "admin";
const PROFILE_SCOPE_PREFIX = "profile:";
const PROFILE_SCOPE_UNASSIGNED = "profile:unassigned";

export function scopeIdForProfile(profileId: string | null | undefined): string {
  if (profileId === null || profileId === undefined) {
    return PROFILE_SCOPE_UNASSIGNED;
  }
  const trimmed = String(profileId).trim();
  if (!trimmed) {
    return PROFILE_SCOPE_UNASSIGNED;
  }
  return `${PROFILE_SCOPE_PREFIX}${trimmed}`;
}

export function scopeIdsForProfiles(
  profileIds: ReadonlyArray<string | null | undefined>,
  includeAdmin = true,
): string[] {
  const scopes = new Set<string>();
  if (includeAdmin) {
    scopes.add(DASHBOARD_ADMIN_SCOPE);
  }
  for (const id of profileIds) {
    scopes.add(scopeIdForProfile(id));
  }
  return Array.from(scopes).sort();
}

type DashboardArea = (typeof DASHBOARD_CACHE_AREA)[keyof typeof DASHBOARD_CACHE_AREA];

let cacheTableReady = false;

async function ensureCacheTable(env: Env): Promise<void> {
  if (cacheTableReady) {
    return;
  }
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS cache_tokens (
        cache_area TEXT NOT NULL,
        cache_scope TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (cache_area, cache_scope)
      )`,
    )
    .run();
  await env.DB
    .prepare(
      `CREATE INDEX IF NOT EXISTS ix_cache_tokens_area_scope
         ON cache_tokens(cache_area, cache_scope)`,
    )
    .run();
  cacheTableReady = true;
}

async function ensureTokens(env: Env, area: DashboardArea, scopes: string[]): Promise<void> {
  if (!scopes.length) return;
  await ensureCacheTable(env);
  const now = nowISO();
  const stmt = env.DB.prepare(
    `INSERT OR IGNORE INTO cache_tokens (cache_area, cache_scope, version, updated_at)
     VALUES (?1, ?2, 0, ?3)`,
  );
  for (const scope of scopes) {
    await stmt.bind(area, scope, now).run();
  }
}

export async function getDashboardTokenSignature(
  env: Env,
  area: DashboardArea,
  scopes: string[],
): Promise<string> {
  if (!scopes.length) return "0";
  await ensureTokens(env, area, scopes);
  const placeholders = scopes.map((_, index) => `?${index + 3}`).join(",");
  const rows = await env.DB
    .prepare(
      `SELECT cache_scope, version
         FROM cache_tokens
        WHERE cache_area = ?1
          AND cache_scope IN (${placeholders})`,
    )
    .bind(area, ...scopes)
    .all<{ cache_scope: string; version: number | string | null }>();
  const map = new Map<string, number>();
  for (const scope of scopes) {
    map.set(scope, 0);
  }
  for (const row of rows.results ?? []) {
    const version = row.version === null || row.version === undefined ? 0 : Number(row.version);
    map.set(row.cache_scope, Number.isFinite(version) ? version : 0);
  }
  return scopes.map((scope) => map.get(scope) ?? 0).join("-");
}

export async function bumpDashboardTokens(
  env: Env,
  area: DashboardArea,
  scopes: string[],
): Promise<void> {
  if (!scopes.length) return;
  await ensureTokens(env, area, scopes);
  const now = nowISO();
  const stmt = env.DB.prepare(
    `INSERT INTO cache_tokens (cache_area, cache_scope, version, updated_at)
     VALUES (?1, ?2, 1, ?3)
     ON CONFLICT(cache_area, cache_scope)
     DO UPDATE SET version = cache_tokens.version + 1, updated_at = excluded.updated_at`,
  );
  for (const scope of scopes) {
    await stmt.bind(area, scope, now).run();
  }
}

export async function deleteDashboardCacheKeys(
  keys: string[],
  options: { logger?: import("../utils/logging").Logger } = {},
): Promise<void> {
  for (const key of keys) {
    await deleteCacheKey(key, options);
  }
}
