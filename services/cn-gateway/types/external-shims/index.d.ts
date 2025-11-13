declare module "@alicloud/kms20160120" {
  export class SignRequest {
    [key: string]: unknown;
    body?: Record<string, unknown>;
    constructor(options?: Record<string, unknown>);
  }
  export default class Client {
    [key: string]: unknown;
    constructor(config: Record<string, unknown>);
    signWithOptions(
      request: Record<string, unknown>,
      runtime?: Record<string, unknown>
    ): Promise<{ body?: { SignatureValue?: string } }>;
  }
}

declare module "@alicloud/openapi-client" {
  export class Config {
    [key: string]: unknown;
    constructor(options?: Record<string, unknown>);
  }
}

declare module "@alicloud/tea-util" {
  export class RuntimeOptions {
    [key: string]: unknown;
    constructor(options?: Record<string, unknown>);
  }
}

declare module "@huaweicloud/huaweicloud-sdk-core/auth/basiccredentials" {
  export class BasicCredentials {
    [key: string]: unknown;
    withAk(ak: string): this;
    withSk(sk: string): this;
    withProjectId(projectId: string): this;
    withDomainId(domainId: string): this;
  }
}

declare module "@huaweicloud/huaweicloud-sdk-kms" {
  export class SignRequest {
    [key: string]: unknown;
    withBody(body: SignRequestBody): this;
  }
  export class SignRequestBody {
    [key: string]: unknown;
    withKeyId(keyId: string): this;
    withMessage(message: string): this;
    withMessageType(type: string): this;
    withSigningAlgorithm(algo: string): this;
  }
  export class KmsClient {
    static newBuilder(): {
      withCredential(creds: Record<string, unknown>): {
        withEndpoint(endpoint: string): {
          build(): KmsClient;
        };
      };
    };
    sign(request: SignRequest): Promise<unknown>;
  }
}

declare module "tencentcloud-sdk-nodejs" {
  export namespace kms {
    namespace v20190118 {
      interface KmsResponse extends Record<string, unknown> {
        Mac?: string;
      }
      type KmsParams = Record<string, unknown>;
      class Client {
        constructor(options: Record<string, unknown>);
        GenerateMac(params: KmsParams): Promise<KmsResponse>;
      }
    }
  }
  const sdk: { kms: typeof kms };
  export default sdk;
}

declare module "ioredis" {
  export class Redis {
    constructor(...args: unknown[]);
    on(event: string, listener: (...args: unknown[]) => void): this;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    quit(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: unknown, ...args: unknown[]): Promise<unknown>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
  }
  export default Redis;
}

declare module "ajv/dist/2020.js" {
  export type AjvValidator<TData = unknown> = ((data: unknown) => data is TData) & {
    errors?: unknown;
  };
  export default class Ajv2020 {
    constructor(options?: Record<string, unknown>);
    compile<TOutput = unknown>(schema: unknown): AjvValidator<TOutput>;
  }
}

declare module "ajv-formats" {
  export default function addFormats(
    ajv: unknown,
    formats?: Record<string, unknown> | string[]
  ): unknown;
}
