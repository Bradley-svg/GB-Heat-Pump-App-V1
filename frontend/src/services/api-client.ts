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

function buildUrl(config: AppConfig, path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = config.apiBase ?? "";
  if (!base) return path;
  return `${base}${path}`;
}

async function requestJson<T>(
  config: AppConfig,
  path: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const url = buildUrl(config, path);
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

  constructor(config: AppConfig) {
    this.config = config;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    const { signal, ...rest } = options ?? {};
    return requestJson<T>(
      this.config,
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
      this.config,
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
