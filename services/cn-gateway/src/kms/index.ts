import { config, type AppConfig } from "../config.js";
import { logger } from "../logging.js";
import { AlibabaKmsAdapter } from "./alibaba-kms.js";
import { DevMemoryKmsAdapter } from "./dev-mem.js";
import { HuaweiKmsAdapter } from "./huawei-kms.js";
import { TencentKmsAdapter } from "./tencent-kms.js";

export interface KmsAdapter {
  signHmacSHA256(input: Buffer): Promise<Buffer>;
  keyVersion(): string;
}

let cachedAdapter: KmsAdapter | null = null;

function ensureAdapter(appConfig: AppConfig = config): KmsAdapter {
  if (cachedAdapter) {
    return cachedAdapter;
  }

  switch (appConfig.KMS_PROVIDER) {
    case "alibaba":
      cachedAdapter = new AlibabaKmsAdapter(appConfig);
      break;
    case "tencent":
      cachedAdapter = new TencentKmsAdapter(appConfig);
      break;
    case "huawei":
      cachedAdapter = new HuaweiKmsAdapter(appConfig);
      break;
    case "dev":
      cachedAdapter = new DevMemoryKmsAdapter(appConfig);
      break;
    default:
      throw new Error(`Unsupported KMS provider: ${appConfig.KMS_PROVIDER}`);
  }

  logger.info(
    {
      provider: appConfig.KMS_PROVIDER,
      keyVersion: cachedAdapter.keyVersion()
    },
    "KMS adapter initialized"
  );

  return cachedAdapter;
}

export function getKmsAdapter(): KmsAdapter {
  return ensureAdapter();
}

export function resetKmsAdapter(newKeyVersion?: string) {
  if (newKeyVersion) {
    config.KMS_KEY_VERSION = newKeyVersion;
  }
  cachedAdapter = null;
}
