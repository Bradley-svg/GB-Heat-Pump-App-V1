import type { AppConfig } from "../app/config";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  signal?: AbortSignal;
}

export interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
}

const HTTP_PATTERN = /^https?:\/\//i;
const PLACEHOLDER_ORIGIN = "https://api-base.invalid";
const SUFFIX_PATTERN = /^([^?#]*)(\?[^#]*)?(#.*)?$/;

function isAbsoluteUrl(candidate: string): boolean {
  const lower = candidate.toLowerCase();
  return lower.startsWith("http://") || lower.startsWith("https://") || candidate.startsWith("//");
}

function sanitizeBasePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  if (collapsed.endsWith("/")) {
    return collapsed.replace(/\/+$/, "/");
  }
  return collapsed;
}

function splitSuffix(input: string): { path: string; search: string; hash: string } {
  const match = SUFFIX_PATTERN.exec(input);
  return {
    path: match?.[1] ?? "",
    search: match?.[2] ?? "",
    hash: match?.[3] ?? "",
  };
}

function mergeSearch(baseSearch: string, pathSearch: string): string {
  if (!baseSearch) return pathSearch;
  if (!pathSearch) return baseSearch;

  const params = new URLSearchParams(baseSearch.slice(1));
  const additional = new URLSearchParams(pathSearch.slice(1));
  additional.forEach((value, key) => {
    params.append(key, value);
  });

  const combined = params.toString();
  return combined ? `?${combined}` : "";
}

function combinePath(basePath: string, resourcePath: string): string {
  const sanitizedBase = sanitizeBasePath(basePath);
  if (!resourcePath) {
    return sanitizedBase;
  }
  const normalizedResource = resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`;
  const comparisonBase = sanitizedBase.startsWith("/") ? sanitizedBase : `/${sanitizedBase}`;
  if (
    comparisonBase !== "/" &&
    (normalizedResource === comparisonBase || normalizedResource.startsWith(`${comparisonBase}/`))
  ) {
    // Caller already provided a path within the configured base; reuse it without duplication.
    return sanitizeBasePath(normalizedResource);
  }
  const normalizedBase = sanitizedBase.endsWith("/") ? sanitizedBase : `${sanitizedBase}/`;
  const trimmedResource = resourcePath.startsWith("/") ? resourcePath.slice(1) : resourcePath;
  const combined = `${normalizedBase}${trimmedResource}`;
  return sanitizeBasePath(combined);
}

function normalizeApiBase(base: string | undefined): string {
  const trimmed = base?.trim() ?? "";
  if (!trimmed) return "";

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed);
  if (hasScheme && !HTTP_PATTERN.test(trimmed)) {
    return "";
  }

  try {
    const isRootRelative = trimmed.startsWith("/");
    const url = hasScheme ? new URL(trimmed) : new URL(trimmed, PLACEHOLDER_ORIGIN);
    url.pathname = sanitizeBasePath(url.pathname);
    const serialized = url.toString();
    if (hasScheme) {
      return serialized;
    }
    const withoutPlaceholder = serialized.replace(PLACEHOLDER_ORIGIN, "");
    if (isRootRelative) {
      return withoutPlaceholder;
    }
    return withoutPlaceholder.startsWith("/") ? withoutPlaceholder.slice(1) : withoutPlaceholder;
  } catch {
    return "";
  }
}

function buildUrl(apiBase: string, path: string) {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  if (!apiBase) {
    return path;
  }
  if (!path) {
    return apiBase;
  }

  try {
    const baseUrl = new URL(apiBase);
    const suffix = splitSuffix(path);
    baseUrl.pathname = combinePath(baseUrl.pathname, suffix.path);
    baseUrl.search = mergeSearch(baseUrl.search, suffix.search);
    baseUrl.hash = suffix.hash || baseUrl.hash;
    return baseUrl.toString();
  } catch {
    const placeholderBase = new URL(apiBase, PLACEHOLDER_ORIGIN);
    const suffix = splitSuffix(path);
    placeholderBase.pathname = combinePath(placeholderBase.pathname, suffix.path);
    placeholderBase.search = mergeSearch(placeholderBase.search, suffix.search);
    placeholderBase.hash = suffix.hash || placeholderBase.hash;
    const serialized = placeholderBase.toString();
    const withoutPlaceholder = serialized.replace(PLACEHOLDER_ORIGIN, "");
    if (!apiBase.startsWith("/") && withoutPlaceholder.startsWith("/")) {
      return withoutPlaceholder.slice(1);
    }
    return withoutPlaceholder;
  }
}

async function requestJson<T>(
  apiBase: string,
  path: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const url = buildUrl(apiBase, path);
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const requestInit: RequestInit = { ...init, headers, signal };
  requestInit.credentials ??= "include";

  const response = await fetch(url, requestInit);
  const text = await response.text();
  const body = text ? safeParseJson(text) : null;
  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status, body);
  }
  return body as T;
}

function safeParseJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

class FetchApiClient implements ApiClient {
  private readonly apiBase: string;

  constructor(config: AppConfig) {
    this.apiBase = normalizeApiBase(config.apiBase);
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    const { signal, ...rest } = options ?? {};
    return requestJson<T>(
      this.apiBase,
      path,
      {
        method: "GET",
        ...rest,
      },
      signal,
    );
  }

  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    const { signal, ...rest } = options ?? {};
    return requestJson<T>(
      this.apiBase,
      path,
      {
        method: "POST",
        body: JSON.stringify(body),
        ...rest,
      },
      signal,
    );
  }

  patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    const { signal, ...rest } = options ?? {};
    return requestJson<T>(
      this.apiBase,
      path,
      {
        method: "PATCH",
        body: JSON.stringify(body),
        ...rest,
      },
      signal,
    );
  }

  put<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    const { signal, ...rest } = options ?? {};
    return requestJson<T>(
      this.apiBase,
      path,
      {
        method: "PUT",
        body: JSON.stringify(body),
        ...rest,
      },
      signal,
    );
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const { signal, ...rest } = options ?? {};
    return requestJson<T>(
      this.apiBase,
      path,
      {
        method: "DELETE",
        ...rest,
      },
      signal,
    );
  }
}

export function createApiClient(config: AppConfig): ApiClient {
  return new FetchApiClient(config);
}

export const __testables = {
  normalizeApiBase,
  buildUrl,
};
