import Client, * as KMS from "@alicloud/kms20160120";
import * as $OpenApi from "@alicloud/openapi-client";
import * as $Util from "@alicloud/tea-util";
import type { AppConfig } from "../config.js";
import type { KmsAdapter } from "./index.js";

export class AlibabaKmsAdapter implements KmsAdapter {
  private readonly client: Client;
  private readonly cfg: AppConfig;

  constructor(appConfig: AppConfig) {
    const region = appConfig.ALIBABA_REGION;
    const accessKeyId = appConfig.ALIBABA_ACCESS_KEY_ID;
    const accessKeySecret = appConfig.ALIBABA_ACCESS_KEY_SECRET;
    if (!region || !accessKeyId || !accessKeySecret) {
      throw new Error("Alibaba KMS requires ALIBABA_REGION, ALIBABA_ACCESS_KEY_ID, ALIBABA_ACCESS_KEY_SECRET");
    }
    this.cfg = appConfig;

    const clientConfig = new $OpenApi.Config({
      accessKeyId,
      accessKeySecret,
      regionId: region,
      endpoint: `kms.${region}.aliyuncs.com`
    });
    this.client = new Client(clientConfig);
  }

  async signHmacSHA256(input: Buffer): Promise<Buffer> {
    const request = new KMS.SignRequest({
      KeyId: this.cfg.KMS_KEY_ALIAS,
      KeyVersionId: this.cfg.KMS_KEY_VERSION,
      Message: input.toString("base64"),
      MessageType: "RAW",
      SigningAlgorithm: "HMAC_SHA_256"
    });
    const runtime = new $Util.RuntimeOptions({
      connectTimeout: 3000,
      readTimeout: 3000
    });
    const response = await this.client.signWithOptions(request, runtime);
    const signature = response?.body?.SignatureValue;
    if (!signature) {
      throw new Error("Alibaba KMS returned empty signature");
    }
    return Buffer.from(signature, "base64");
  }

  keyVersion(): string {
    return this.cfg.KMS_KEY_VERSION;
  }
}
