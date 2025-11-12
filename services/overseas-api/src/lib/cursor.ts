import type { Env } from "../env";
import { base64UrlDecode, base64UrlEncode } from "../utils";

const cursorKeyCache = new Map<string, Promise<CryptoKey>>();

function ensureCursorSecret(env: Env) {
  const secret = env.CURSOR_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("CURSOR_SECRET must be configured (>= 16 characters)");
  }
  return secret;
}

async function importCursorKey(secret: string) {
  if (!cursorKeyCache.has(secret)) {
    const encoder = new TextEncoder();
    const secretHash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
    const keyPromise = crypto.subtle.importKey(
      "raw",
      secretHash,
      "AES-GCM",
      false,
      ["encrypt", "decrypt"],
    );
    cursorKeyCache.set(secret, keyPromise);
  }
  return cursorKeyCache.get(secret)!;
}

export async function sealCursorId(env: Env, deviceId: string) {
  const secret = ensureCursorSecret(env);
  const key = await importCursorKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(deviceId),
  );
  return `enc.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`;
}

export async function unsealCursorId(env: Env, token: string) {
  const secret = ensureCursorSecret(env);
  const key = await importCursorKey(secret);
  const [, ivPart, dataPart] = token.split(".", 3);
  if (!ivPart || !dataPart) return null;
  const ivArray = base64UrlDecode(ivPart);
  const payloadArray = base64UrlDecode(dataPart);
  if (!ivArray || !payloadArray) return null;
  const ivBuffer = new ArrayBuffer(ivArray.length);
  new Uint8Array(ivBuffer).set(ivArray);
  const payloadBuffer = new ArrayBuffer(payloadArray.length);
  new Uint8Array(payloadBuffer).set(payloadArray);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, key, payloadBuffer);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

export async function parseCursorId(
  encoded: string | null,
  env: Env,
  isAdmin: boolean,
): Promise<{ ok: true; id: string | null } | { ok: false }> {
  if (!encoded) return { ok: true, id: null };
  if (!encoded.startsWith("enc.")) {
    return isAdmin ? { ok: true, id: encoded } : { ok: false };
  }
  try {
    const unsealed = await unsealCursorId(env, encoded);
    if (!unsealed) return { ok: false };
    return { ok: true, id: unsealed };
  } catch {
    return { ok: false };
  }
}
