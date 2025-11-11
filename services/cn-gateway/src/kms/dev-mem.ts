import crypto from "node:crypto";
import type { AppConfig } from "../config.js";
import type { KmsAdapter } from "./index.js";

export class DevMemoryKmsAdapter implements KmsAdapter {
  private readonly key: Buffer;
  private readonly version: string;

  constructor(appConfig: AppConfig) {
    if (!appConfig.DEV_KMS_KEY) {
      throw new Error("DEV_KMS_KEY must be set when KMS_PROVIDER=dev");
    }
    this.key = Buffer.from(appConfig.DEV_KMS_KEY, "utf8");
    this.version = `${appConfig.KMS_KEY_VERSION}`;
  }

  async signHmacSHA256(input: Buffer): Promise<Buffer> {
    return crypto.createHmac("sha256", this.key).update(input).digest();
  }

  keyVersion(): string {
    return this.version;
  }
}
