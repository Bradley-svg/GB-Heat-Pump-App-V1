import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { utf8ToBytes } from "@noble/hashes/utils";

export interface PseudonymizeOptions {
  key: Buffer | string;
  keyVersion: string;
  truncate?: number;
}

export interface PseudonymizeResult {
  didPseudo: string;
  keyVersion: string;
}

const DEFAULT_TRUNCATE = 22;

export function pseudonymizeDeviceId(deviceIdRaw: string, options: PseudonymizeOptions): PseudonymizeResult {
  if (!deviceIdRaw) {
    throw new Error("deviceIdRaw is required");
  }
  if (!options.key || !options.keyVersion) {
    throw new Error("key and keyVersion are required");
  }

  const truncate = options.truncate ?? DEFAULT_TRUNCATE;
  const digest = hmac(sha256, normalizeKey(options.key), utf8ToBytes(deviceIdRaw));
  const base64Url = toBase64(digest).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return {
    didPseudo: base64Url.slice(0, truncate),
    keyVersion: options.keyVersion,
  };
}

function normalizeKey(key: Buffer | string): Uint8Array {
  if (typeof key === "string") {
    return utf8ToBytes(key);
  }
  if (key instanceof Uint8Array) {
    return key;
  }
  // Buffer in CommonJS environments
  return new Uint8Array(key);
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
