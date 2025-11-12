declare module "vitest" {
  export const describe: (...args: unknown[]) => void;
  export const it: (...args: unknown[]) => void;
  export const expect: any;
  export const beforeAll: (...args: unknown[]) => void;
  export const beforeEach: (...args: unknown[]) => void;
  export const afterAll: (...args: unknown[]) => void;
  export const afterEach: (...args: unknown[]) => void;
  export const vi: Record<string, any> & {
    fn: (...args: unknown[]) => { mock: { calls: unknown[][] } };
    spyOn: (...args: unknown[]) => {
      mock: { calls: unknown[][] };
      mockResolvedValueOnce: (...args: unknown[]) => unknown;
    };
    clearAllMocks: () => void;
    restoreAllMocks: () => void;
  };
}
