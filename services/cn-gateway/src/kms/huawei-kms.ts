import { KmsClient, SignRequest, SignRequestBody } from "@huaweicloud/huaweicloud-sdk-kms";
import { BasicCredentials } from "@huaweicloud/huaweicloud-sdk-core/auth/basiccredentials";
import type { AppConfig } from "../config.js";
import type { KmsAdapter } from "./index.js";

export class HuaweiKmsAdapter implements KmsAdapter {
  private readonly client: KmsClient;
  private readonly cfg: AppConfig;

  constructor(appConfig: AppConfig) {
    const region = appConfig.HUAWEI_REGION;
    const projectId = appConfig.HUAWEI_PROJECT_ID;
    const domainId = appConfig.HUAWEI_DOMAIN_ID;
    const accessKey = appConfig.HUAWEI_ACCESS_KEY;
    const secretKey = appConfig.HUAWEI_SECRET_KEY;
    if (!region || !projectId || !domainId || !accessKey || !secretKey) {
      throw new Error(
        "Huawei KMS requires HUAWEI_REGION, HUAWEI_PROJECT_ID, HUAWEI_DOMAIN_ID, HUAWEI_ACCESS_KEY, HUAWEI_SECRET_KEY"
      );
    }
    this.cfg = appConfig;

    const credentials = new BasicCredentials()
      .withAk(accessKey)
      .withSk(secretKey)
      .withProjectId(projectId)
      .withDomainId(domainId);

    this.client = KmsClient.newBuilder()
      .withCredential(credentials)
      .withEndpoint(`https://kms.${region}.myhuaweicloud.com`)
      .build();
  }

  async signHmacSHA256(input: Buffer): Promise<Buffer> {
    const body = new SignRequestBody()
      .withKeyId(this.cfg.KMS_KEY_ALIAS)
      .withMessage(input.toString("base64"))
      .withMessageType("RAW")
      .withSigningAlgorithm("HMAC_SHA_256");
    const request = new SignRequest().withBody(body);
    const response = await this.client.sign(request);
    const signature =
      (response as unknown as { signatureValue?: string }).signatureValue ??
      (response as Record<string, unknown>)["signature_value"];
    if (!signature || typeof signature !== "string") {
      throw new Error("Huawei KMS returned empty signature");
    }
    return Buffer.from(signature, "base64");
  }

  keyVersion(): string {
    return this.cfg.KMS_KEY_VERSION;
  }
}
