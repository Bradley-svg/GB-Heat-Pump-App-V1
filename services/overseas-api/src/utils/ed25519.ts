import type { Env } from "../env";

let cachedKey: CryptoKey | null = null;
let cachedPem: string | null = null;

function pemBody(pem: string): string {
  return pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
}

function decodeBase64(base64: string): Uint8Array {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const nodeBuffer = (globalThis as { Buffer?: { from(data: string, encoding: string): Uint8Array } }).Buffer;
  if (nodeBuffer) {
    return nodeBuffer.from(padded, "base64");
  }
  const binary = (globalThis.atob as (data: string) => string)(padded);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = decodeBase64(base64);
  return binary.buffer
    .slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer;
}

async function importVerifyKey(pem: string): Promise<CryptoKey> {
  if (cachedKey && cachedPem === pem) {
    return cachedKey;
  }
  const body = pemBody(pem);
  const keyData = base64ToArrayBuffer(body);
  const algorithms: AlgorithmIdentifier[] = [
    { name: "NODE-ED25519" },
    { name: "Ed25519" }
  ];
  let lastError: unknown;
  for (const algorithm of algorithms) {
    try {
      const key = await crypto.subtle.importKey("spki", keyData, algorithm, true, ["verify"]);
      cachedKey = key;
      cachedPem = pem;
      return key;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Unable to import verification key");
}

export async function verifyBatchSignature(
  env: Env,
  payload: ArrayBuffer,
  signatureBase64: string
): Promise<boolean> {
  if (!env.EXPORT_VERIFY_PUBKEY) {
    return false;
  }
  try {
    const key = await importVerifyKey(env.EXPORT_VERIFY_PUBKEY);
    const signatureBytes = base64ToArrayBuffer(signatureBase64.trim());
    const algorithm =
      (key.algorithm as AlgorithmIdentifier | undefined) ?? { name: "NODE-ED25519" };
    return crypto.subtle.verify(algorithm, key, signatureBytes, payload);
  } catch (error) {
    console.warn("[ingest] Failed to verify batch signature", error);
    return false;
  }
}
