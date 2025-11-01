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
}

const HTTP_PATTERN = /^https?:\/\//i;
const PROTOCOL_RELATIVE_PATTERN = /^\/\//;

function isAbsoluteUrl(candidate: string): boolean {
  return HTTP_PATTERN.test(candidate) || PROTOCOL_RELATIVE_PATTERN.test(candidate);
}

function normalizeApiBase(base: string | undefined): string {
  const trimmed = base?.trim() ?? "";
  if (!trimmed) return "";

  const [, pathPart = "", suffix = ""] = trimmed.match(/^([^?#]*)(.*)$/) ?? [];

  if (!suffix) {
    let normalizedPath = pathPart.replace(/\/+$/, "");
    if (!normalizedPath) {
      normalizedPath = "/";
    }
    return normalizedPath;
  }

  const collapsedPath = pathPart.endsWith("/") ? pathPart.replace(/\/+$/, "/") : pathPart;
  const safePath = collapsedPath || "/";
  return `${safePath}${suffix}`;
}

function joinWithBase(base: string, path: string): string {
  if (!base) return path;
  if (!path) return base;

  const trailing = base.endsWith("/");
  const leading = path.startsWith("/");

  if (trailing && leading) {
    return base + path.slice(1);
  }
  if (!trailing && !leading) {
    return `${base}/${path}`;
  }
  return base + path;
}

function buildUrl(apiBase: string, path: string) {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  return joinWithBase(apiBase, path);
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

  const response = await fetch(url, { ...init, headers, signal });
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
  private readonly config: AppConfig;
  private readonly apiBase: string;

  constructor(config: AppConfig) {
    this.config = config;
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
}

export function createApiClient(config: AppConfig): ApiClient {
  return new FetchApiClient(config);
}

export const __testables = {
  normalizeApiBase,
  buildUrl,
};
