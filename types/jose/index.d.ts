declare module "jose" {
  export interface JWTPayload extends Record<string, unknown> {}

  export function createRemoteJWKSet(input: unknown): unknown;
  export function decodeJwt(token: string): JWTPayload;
  export function jwtVerify<T = JWTPayload>(
    token: string,
    key: unknown,
    options?: unknown,
  ): Promise<{ payload: T }>;
}
