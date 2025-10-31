import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto || !globalThis.crypto.subtle) {
  // Ensure Web Crypto API is available when running in Node.
  (globalThis as any).crypto = webcrypto as unknown as Crypto;
}

if (typeof globalThis.btoa === "undefined") {
  globalThis.btoa = (data: string) => Buffer.from(data, "binary").toString("base64");
}

if (typeof globalThis.atob === "undefined") {
  globalThis.atob = (input: string) => Buffer.from(input, "base64").toString("binary");
}
