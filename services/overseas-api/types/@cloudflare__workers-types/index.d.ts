declare module "@cloudflare/workers-types" {
  export interface Queue<T = unknown> {
    send(message: T, options?: unknown): Promise<void>;
  }

  export type D1PreparedStatement = globalThis.D1PreparedStatement;
  export type D1Database = globalThis.D1Database;
  export type R2Bucket = globalThis.R2Bucket;
  export type ExecutionContext = globalThis.ExecutionContext;
}
