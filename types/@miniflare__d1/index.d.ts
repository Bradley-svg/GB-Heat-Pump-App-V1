declare module "@miniflare/d1" {
  export class D1DatabaseAPI {
    constructor(database: any);
    prepare(query: string): any;
    fetch?(request: Request): Promise<Response>;
  }

  export class D1Database {
    constructor(api: any);
    prepare(query: string): any;
    batch<T = any>(statements: any[]): Promise<T[]>;
  }
}
