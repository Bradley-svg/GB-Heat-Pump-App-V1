import { normalizeUint8Array } from "./typed-arrays";

export interface PasswordHash {
  hash: Uint8Array;
  salt: Uint8Array;
  iterations: number;
}

export interface SerializedPasswordHash {
  hash: string;
  salt: string;
  iterations: number;
}

const MIN_PASSWORD_LENGTH = 8;
const DEFAULT_SALT_LENGTH = 16;
const DEFAULT_ITERATIONS = 100_000;
const HASH_BITS = 256;

export interface HashPasswordOptions {
  iterations?: number;
  saltLength?: number;
}

export async function hashPassword(
  password: string,
  { iterations = DEFAULT_ITERATIONS, saltLength = DEFAULT_SALT_LENGTH }: HashPasswordOptions = {},
): Promise<PasswordHash> {
  assertValidPasswordInput(password);
  const salt = randomBytes(saltLength);
  const hash = await deriveKey(password, salt, iterations);
  return { hash, salt, iterations };
}

export async function verifyPassword(
  password: string,
  stored: PasswordHash,
): Promise<boolean> {
  assertValidPasswordInput(password);
  const candidate = await deriveKey(password, stored.salt, stored.iterations);
  return timingSafeEqual(candidate, stored.hash);
}

export function serializePasswordHash(record: PasswordHash): SerializedPasswordHash {
  return {
    hash: toBase64(record.hash),
    salt: toBase64(record.salt),
    iterations: record.iterations,
  };
}

export function deserializePasswordHash(record: SerializedPasswordHash): PasswordHash {
  return {
    hash: fromBase64(record.hash),
    salt: fromBase64(record.salt),
    iterations: record.iterations,
  };
}

function assertValidPasswordInput(password: string) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }
}

function randomBytes(length: number): Uint8Array {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return buffer;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_BITS,
  );
  return new Uint8Array(derivedBits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const left = normalizeUint8Array(a);
  const right = normalizeUint8Array(b);
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < left.length; i++) {
    diff |= left[i] ^ right[i];
  }
  return diff === 0;
}

function toBase64(value: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < value.length; i++) {
    binary += String.fromCharCode(value[i]!);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i) & 0xff;
  }
  return bytes;
}
