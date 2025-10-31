import type { Env, User } from "../env";
import { parseCursorId, sealCursorId } from "./cursor";
import { maskId, parseFaultsJson, parseMetricsJson, sha256Hex } from "../utils";
import { userIsAdmin } from "./access";

export function buildDeviceScope(user: User, alias = "d") {
  const isAdmin = userIsAdmin(user);
  if (isAdmin) {
    return { isAdmin: true, empty: false, clause: "", bind: [] as any[] };
  }
  const ids = user.clientIds || [];
  if (!ids.length) {
    return { isAdmin: false, empty: true, clause: "", bind: [] as any[] };
  }
  const placeholders = ids.map(() => "?").join(",");
  return {
    isAdmin: false,
    empty: false,
    clause: `${alias}.profile_id IN (${placeholders})`,
    bind: [...ids],
  };
}

export function presentDeviceId(id: string, isAdmin: boolean) {
  return isAdmin ? id : maskId(id);
}

export async function resolveDeviceId(raw: string, env: Env, isAdmin: boolean): Promise<string | null> {
  if (isAdmin) return raw;
  if (!raw) return null;
  const parsed = await parseCursorId(raw, env, isAdmin);
  if (!parsed.ok || !parsed.id) return null;
  return parsed.id;
}

export async function buildDeviceLookup(id: string, env: Env, isAdmin: boolean) {
  return isAdmin ? id : sealCursorId(env, id);
}

export async function claimDeviceIfUnowned(env: Env, deviceId: string, profileId: string) {
  await env.DB.prepare(
    `UPDATE devices SET profile_id = ?2 WHERE device_id = ?1 AND profile_id IS NULL`
  ).bind(deviceId, profileId).run();

  const row = await env.DB
    .prepare(`SELECT profile_id FROM devices WHERE device_id = ?1`)
    .bind(deviceId)
    .first<{ profile_id?: string | null }>();

  if (!row) return { ok: false as const, reason: "unknown_device" };
  if (row.profile_id && row.profile_id !== profileId) {
    return { ok: false as const, reason: "claimed_by_other", owner: row.profile_id };
  }
  return { ok: true as const };
}

export interface DeviceKeyVerification {
  ok: boolean;
  deviceKeyHash?: string;
  reason?:
    | "missing_key"
    | "unknown_device"
    | "missing_device_key"
    | "mismatch";
}

export async function verifyDeviceKey(
  env: Env,
  deviceId: string,
  keyHeader: string | null,
): Promise<DeviceKeyVerification> {
  if (!keyHeader) return { ok: false, reason: "missing_key" };
  const row = await env.DB
    .prepare(`SELECT device_key_hash FROM devices WHERE device_id = ?1`)
    .bind(deviceId)
    .first<{ device_key_hash?: string }>();
  if (!row) return { ok: false, reason: "unknown_device" };
  if (!row.device_key_hash) return { ok: false, reason: "missing_device_key" };
  const hash = await sha256Hex(keyHeader);
  if (hash.toLowerCase() !== String(row.device_key_hash).toLowerCase()) {
    return { ok: false, reason: "mismatch" };
  }
  return { ok: true, deviceKeyHash: hash };
}

export { parseFaultsJson, parseMetricsJson, userIsAdmin };
