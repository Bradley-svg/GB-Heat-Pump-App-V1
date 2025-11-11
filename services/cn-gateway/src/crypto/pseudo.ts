import { getKmsAdapter, type KmsAdapter } from "../kms/index.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export interface PseudonymizationResult {
  didPseudo: string;
  keyVersion: string;
}

export async function pseudonymizeDeviceId(
  deviceIdRaw: string,
  adapter: KmsAdapter = getKmsAdapter(),
  truncate = 22
): Promise<PseudonymizationResult> {
  if (!deviceIdRaw) {
    throw new Error("deviceIdRaw missing");
  }
  const digest = await adapter.signHmacSHA256(Buffer.from(deviceIdRaw, "utf8"));
  const base64url = digest
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
  const didPseudo = base64url.slice(0, truncate);
  return { didPseudo, keyVersion: adapter.keyVersion() };
}

export function appendCollisionSuffix(base: string, counter: number): string {
  if (counter < 0) {
    throw new Error("counter must be positive");
  }
  const normalized = counter % (BASE32_ALPHABET.length * BASE32_ALPHABET.length);
  const first = BASE32_ALPHABET[Math.floor(normalized / BASE32_ALPHABET.length)];
  const second = BASE32_ALPHABET[normalized % BASE32_ALPHABET.length];
  return `${base}${first}${second}`;
}
