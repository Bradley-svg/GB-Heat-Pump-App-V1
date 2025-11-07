"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/auth/password.ts
var password_exports = {};
__export(password_exports, {
  deserializePasswordHash: () => deserializePasswordHash,
  hashPassword: () => hashPassword,
  serializePasswordHash: () => serializePasswordHash,
  verifyPassword: () => verifyPassword
});
module.exports = __toCommonJS(password_exports);

// src/lib/auth/typed-arrays.ts
function normalizeUint8Array(value) {
  if (!value) return new Uint8Array();
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(value);
}

// src/lib/auth/password.ts
var MIN_PASSWORD_LENGTH = 8;
var DEFAULT_SALT_LENGTH = 16;
var DEFAULT_ITERATIONS = 1e5;
var HASH_BITS = 256;
async function hashPassword(password, { iterations = DEFAULT_ITERATIONS, saltLength = DEFAULT_SALT_LENGTH } = {}) {
  assertValidPasswordInput(password);
  const salt = randomBytes(saltLength);
  const hash = await deriveKey(password, salt, iterations);
  return { hash, salt, iterations };
}
async function verifyPassword(password, stored) {
  assertValidPasswordInput(password);
  const candidate = await deriveKey(password, stored.salt, stored.iterations);
  return timingSafeEqual(candidate, stored.hash);
}
function serializePasswordHash(record) {
  return {
    hash: toBase64(record.hash),
    salt: toBase64(record.salt),
    iterations: record.iterations
  };
}
function deserializePasswordHash(record) {
  return {
    hash: fromBase64(record.hash),
    salt: fromBase64(record.salt),
    iterations: record.iterations
  };
}
function assertValidPasswordInput(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }
}
function randomBytes(length) {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return buffer;
}
async function deriveKey(password, salt, iterations) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    HASH_BITS
  );
  return new Uint8Array(derivedBits);
}
function timingSafeEqual(a, b) {
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
function toBase64(value) {
  let binary = "";
  for (let i = 0; i < value.length; i++) {
    binary += String.fromCharCode(value[i]);
  }
  return btoa(binary);
}
function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i) & 255;
  }
  return bytes;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deserializePasswordHash,
  hashPassword,
  serializePasswordHash,
  verifyPassword
});
