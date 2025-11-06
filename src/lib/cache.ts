import type { Logger } from "../utils/logging";

const CACHE_HOST = "https://cache.greenbro.internal";

function buildCacheRequest(key: string): Request {
  return new Request(`${CACHE_HOST}/${encodeURIComponent(key)}`, { method: "GET" });
}

function getDefaultCache(): Cache | null {
  try {
    if (typeof caches === "undefined") {
      return null;
    }
    return caches.default ?? null;
  } catch {
    return null;
  }
}

interface ReadCacheOptions<T> {
  parse?: (raw: string) => T;
  logger?: Logger;
}

export async function readJsonCache<T>(
  key: string,
  options: ReadCacheOptions<T> = {},
): Promise<T | null> {
  const cache = getDefaultCache();
  if (!cache) {
    return null;
  }

  const request = buildCacheRequest(key);
  try {
    const response = await cache.match(request);
    if (!response) {
      return null;
    }
    const text = await response.text();
    if (!text) {
      return null;
    }
    if (options.parse) {
      return options.parse(text);
    }
    return JSON.parse(text) as T;
  } catch (error) {
    options.logger?.warn("cache.read_failed", { key, error });
    return null;
  }
}

interface WriteCacheOptions {
  ttlSeconds?: number;
  logger?: Logger;
}

export async function writeJsonCache(
  key: string,
  payload: unknown,
  { ttlSeconds = 30, logger }: WriteCacheOptions = {},
): Promise<void> {
  const cache = getDefaultCache();
  if (!cache) {
    return;
  }
  const request = buildCacheRequest(key);
  try {
    const body = JSON.stringify(payload);
    const headers = new Headers({
      "content-type": "application/json; charset=utf-8",
      "cache-control": `max-age=0, s-maxage=${ttlSeconds}`,
    });
    const response = new Response(body, { headers });
    await cache.put(request, response);
  } catch (error) {
    logger?.warn("cache.write_failed", { key, error });
  }
}

interface DeleteCacheOptions {
  logger?: Logger;
}

export async function deleteCacheKey(
  key: string,
  { logger }: DeleteCacheOptions = {},
): Promise<void> {
  const cache = getDefaultCache();
  if (!cache) {
    return;
  }
  const request = buildCacheRequest(key);
  try {
    await cache.delete(request);
  } catch (error) {
    logger?.warn("cache.delete_failed", { key, error });
  }
}
