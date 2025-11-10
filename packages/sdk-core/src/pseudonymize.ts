import { createHmac } from "node:crypto";

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
  const hmac = createHmac("sha256", options.key);
  hmac.update(deviceIdRaw, "utf8");
  const digest = hmac.digest();
  const base64Url = digest
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return {
    didPseudo: base64Url.slice(0, truncate),
    keyVersion: options.keyVersion,
  };
}
