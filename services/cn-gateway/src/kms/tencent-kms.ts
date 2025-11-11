import tencentcloud from "tencentcloud-sdk-nodejs";
import type { AppConfig } from "../config.js";
import type { KmsAdapter } from "./index.js";

const { kms } = tencentcloud;
const TencentClient = kms.v20190118.Client;

export class TencentKmsAdapter implements KmsAdapter {
  private readonly client: InstanceType<typeof TencentClient>;
  private readonly cfg: AppConfig;

  constructor(appConfig: AppConfig) {
    const region = appConfig.TENCENT_REGION;
    const secretId = appConfig.TENCENT_SECRET_ID;
    const secretKey = appConfig.TENCENT_SECRET_KEY;
    if (!region || !secretId || !secretKey) {
      throw new Error("Tencent KMS requires TENCENT_REGION, TENCENT_SECRET_ID, TENCENT_SECRET_KEY");
    }
    this.cfg = appConfig;
    this.client = new TencentClient({
      credential: { secretId, secretKey },
      region,
      profile: {
        httpProfile: {
          reqTimeout: 3,
          endpoint: "kms.tencentcloudapi.com"
        }
      }
    });
  }

  async signHmacSHA256(input: Buffer): Promise<Buffer> {
    const result = await this.client.GenerateMac({
      KeyId: this.cfg.KMS_KEY_ALIAS,
      Message: input.toString("base64"),
      MessageType: "RAW",
      Algorithm: "HMAC_SHA256"
    });
    const mac = result?.Mac;
    if (!mac) {
      throw new Error("Tencent KMS returned empty MAC");
    }
    return Buffer.from(mac, "base64");
  }

  keyVersion(): string {
    return this.cfg.KMS_KEY_VERSION;
  }
}
