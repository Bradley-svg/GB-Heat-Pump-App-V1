declare module "node:path" {
  const path: any;
  export default path;
}

declare module "node:fs" {
  export function readFileSync(path: string | URL, options?: any): string;
}

declare module "node:fs/promises" {
  export function readFile(path: string | URL, options?: any): Promise<string>;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}
