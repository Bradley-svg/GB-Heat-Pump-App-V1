const encoder = new TextEncoder();
const decoder = new TextDecoder();

type StoredObject = {
  key: string;
  value: Uint8Array;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
  uploaded: Date;
  etag: string;
};

function cloneBytes(bytes: Uint8Array) {
  return bytes.slice();
}

async function toUint8Array(value: unknown): Promise<Uint8Array> {
  if (value === null || value === undefined) {
    return new Uint8Array();
  }
  if (typeof value === "string") {
    return encoder.encode(value);
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  if (value instanceof ReadableStream) {
    const buffer = await new Response(value).arrayBuffer();
    return new Uint8Array(buffer);
  }
  throw new Error("Unsupported R2 put payload");
}

function toStream(bytes: Uint8Array): ReadableStream<Uint8Array> | null {
  return new Response(cloneBytes(bytes)).body;
}

export interface MockR2Bucket {
  bucket: R2Bucket;
  readText(key: string): Promise<string | null>;
  listKeys(): string[];
  metadata(key: string): StoredObject | undefined;
}

export function createMockR2Bucket(initial: Record<string, { value: string; httpMetadata?: StoredObject["httpMetadata"] }> = {}): MockR2Bucket {
  const store = new Map<string, StoredObject>();

  for (const [key, entry] of Object.entries(initial)) {
    const value = encoder.encode(entry.value);
    store.set(key, {
      key,
      value,
      httpMetadata: entry.httpMetadata,
      uploaded: new Date(),
      etag: `"mock-${key}-${value.length}"`,
    });
  }

  const bucketImpl: Partial<R2Bucket> = {
    async put(key: string, value: unknown, options?: R2PutOptions) {
      const bytes = await toUint8Array(value);
      const uploaded = new Date();
      store.set(key, {
        key,
        value: cloneBytes(bytes),
        httpMetadata: options?.httpMetadata,
        uploaded,
        etag: `"mock-${key}-${uploaded.getTime()}-${bytes.length}"`,
      });
    },

    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      return {
        key,
        size: entry.value.length,
        etag: entry.etag,
        uploaded: entry.uploaded,
        httpMetadata: entry.httpMetadata,
        body: toStream(entry.value),
      } as unknown as R2Object;
    },

    async head(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      return {
        key,
        size: entry.value.length,
        etag: entry.etag,
        uploaded: entry.uploaded,
        httpMetadata: entry.httpMetadata,
      } as unknown as R2ObjectHead;
    },

    async delete(key: string) {
      store.delete(key);
    },

    async list(): Promise<R2Objects> {
      return {
        objects: Array.from(store.values()).map((entry) => ({
          key: entry.key,
          size: entry.value.length,
          etag: entry.etag,
          uploaded: entry.uploaded,
          httpMetadata: entry.httpMetadata,
        })) as any,
        truncated: false,
      };
    },

    async createMultipartUpload(): Promise<R2MultipartUpload> {
      throw new Error("Multipart uploads not implemented in mock bucket");
    },

    async resumeMultipartUpload(): Promise<R2MultipartUpload> {
      throw new Error("Multipart uploads not implemented in mock bucket");
    },

    async multipartUpload(): Promise<R2Object | null> {
      throw new Error("Multipart uploads not implemented in mock bucket");
    },
  };

  return {
    bucket: bucketImpl as R2Bucket,
    async readText(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      return decoder.decode(entry.value);
    },
    listKeys() {
      return Array.from(store.keys()).sort();
    },
    metadata(key: string) {
      const entry = store.get(key);
      if (!entry) return undefined;
      return {
        ...entry,
        value: cloneBytes(entry.value),
      };
    },
  };
}
