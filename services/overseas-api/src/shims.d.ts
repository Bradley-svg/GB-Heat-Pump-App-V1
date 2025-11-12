// Minimal Cloudflare Workers shims so the project compiles even without @cloudflare/workers-types.
// You can remove this file after installing: npm i -D @cloudflare/workers-types

declare global {
  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    first<T = any>(): Promise<T | null>;
    run(): Promise<{ success: boolean } & Record<string, any>>;
    all<T = any>(): Promise<{ results?: T[] } & Record<string, any>>;
  }
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = any>(statements: D1PreparedStatement[]): Promise<T[]>;
    exec?(query: string): Promise<{ success: boolean }>;
    dump?(): Promise<ArrayBuffer>;
  }

  interface ScheduledEvent {
    readonly scheduledTime: number;
    readonly type: "scheduled";
    cron?: string;
    noRetry(): void;
  }

  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }

  type R2Bucket = any;
  type R2HTTPMetadata = any;
  type R2PutOptions = any;
}

export {};
