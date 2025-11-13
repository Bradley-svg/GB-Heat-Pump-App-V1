import { Buffer } from "node:buffer";

interface DevUserPayload {
  email: string;
  roles?: string[];
  clientIds?: string[];
}

export function encodeDevAllowUser(payload: DevUserPayload): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json, "utf8").toString("base64");
  return `base64:${encoded}`;
}
