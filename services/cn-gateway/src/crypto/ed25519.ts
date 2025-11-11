import { createPrivateKey, createPublicKey, sign, verify, type KeyObject } from "node:crypto";
import { promises as fs } from "node:fs";

let cachedPrivateKey: KeyObject | null = null;
let cachedPublicFromPrivate: KeyObject | null = null;

export async function loadPrivateKey(keyPath: string): Promise<KeyObject> {
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }
  const pem = await fs.readFile(keyPath, "utf8");
  cachedPrivateKey = createPrivateKey({
    key: pem,
    format: "pem",
    type: "pkcs8",
    passphrase: undefined
  });
  return cachedPrivateKey;
}

export async function loadPublicKey(pem: string): Promise<KeyObject> {
  return createPublicKey({
    key: pem,
    format: "pem",
    type: "spki"
  });
}

export async function publicKeyFromPrivate(keyPath: string): Promise<KeyObject> {
  if (cachedPublicFromPrivate) {
    return cachedPublicFromPrivate;
  }
  const privateKey = await loadPrivateKey(keyPath);
  cachedPublicFromPrivate = createPublicKey(privateKey);
  return cachedPublicFromPrivate;
}

export async function signBatch(payload: Buffer, keyPath: string): Promise<string> {
  const key = await loadPrivateKey(keyPath);
  const signature = sign(null, payload, key);
  return signature.toString("base64");
}

export async function verifyBatchSignature(
  payload: Buffer,
  signatureBase64: string,
  publicKey: KeyObject | string
): Promise<boolean> {
  const key =
    typeof publicKey === "string"
      ? await loadPublicKey(publicKey)
      : publicKey;
  return verify(null, payload, key, Buffer.from(signatureBase64, "base64"));
}
