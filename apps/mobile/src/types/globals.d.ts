declare global {
  const process:
    | {
        env?: Record<string, string | undefined>;
      }
    | undefined;
}

export {};
