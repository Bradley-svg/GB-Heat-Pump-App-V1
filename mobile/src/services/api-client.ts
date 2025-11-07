import { buildApiUrl } from "../config/app-config";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  query?: Record<string, string | number | undefined>;
}

const resolveEnvCookie = (): string | undefined => {
  const cookie =
    process.env.EXPO_PUBLIC_SESSION_COOKIE ?? process.env.SESSION_COOKIE;
  return cookie && cookie.trim().length > 0 ? cookie.trim() : undefined;
};

let sessionCookie: string | undefined = resolveEnvCookie();

export function setSessionCookie(cookie?: string) {
  sessionCookie =
    cookie && cookie.trim().length > 0 ? cookie.trim() : undefined;
}

export function getSessionCookie(): string | undefined {
  return sessionCookie;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(buildApiUrl(path));
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
      body,
    );
  }
  return body as T;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, options.query);
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (sessionCookie) {
    headers.Cookie = sessionCookie;
  }
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    payload = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers,
    body: payload,
    signal: options.signal,
  });
  return handleResponse<T>(response);
}

export const apiClient = {
  get<T>(path: string, options?: RequestOptions) {
    return request<T>("GET", path, undefined, options);
  },
  post<T>(path: string, body: unknown, options?: RequestOptions) {
    return request<T>("POST", path, body, options);
  },
  patch<T>(path: string, body: unknown, options?: RequestOptions) {
    return request<T>("PATCH", path, body, options);
  },
  put<T>(path: string, body: unknown, options?: RequestOptions) {
    return request<T>("PUT", path, body, options);
  },
  delete<T>(path: string, options?: RequestOptions) {
    return request<T>("DELETE", path, undefined, options);
  },
};
