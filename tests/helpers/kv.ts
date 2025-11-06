type StoreEntry = {
  value: string;
  expiresAtMs?: number;
};

interface KvNamespace {
  get(
    key: string,
    options?: { type?: "text" | "json" | "arrayBuffer" },
  ): Promise<any>;
  put(
    key: string,
    value: string,
    options?: { expiration?: number; expirationTtl?: number; metadata?: unknown },
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

export function createTestKvNamespace(now: () => number = () => Date.now()): KvNamespace {
  const store = new Map<string, StoreEntry>();

  return {
    async get(
      key: string,
      options?: { type?: "text" | "json" | "arrayBuffer" },
    ): Promise<any> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAtMs != null && entry.expiresAtMs <= now()) {
        store.delete(key);
        return null;
      }
      const type = options?.type ?? "text";
      if (type === "json") {
        try {
          return JSON.parse(entry.value);
        } catch {
          return null;
        }
      }
      if (type === "arrayBuffer") {
        const encoder = new TextEncoder();
        return encoder.encode(entry.value).buffer;
      }
      return entry.value;
    },
    async put(
      key: string,
      value: string,
      options?: { expiration?: number; expirationTtl?: number; metadata?: unknown },
    ): Promise<void> {
      let expiresAtMs: number | undefined;
      if (options?.expiration != null) {
        expiresAtMs = options.expiration * 1000;
      } else if (options?.expirationTtl != null) {
        expiresAtMs = now() + options.expirationTtl * 1000;
      }
      store.set(key, { value, expiresAtMs });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

