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

const getSessionCookie = (): string | undefined => {
  const cookie =
    process.env.EXPO_PUBLIC_SESSION_COOKIE ?? process.env.SESSION_COOKIE;
  return cookie && cookie.trim().length > 0 ? cookie.trim() : undefined;
};

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
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
      body,
    );
  }
  return body as T;
}

export const apiClient = {
  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(path, options.query);
    const sessionCookie = getSessionCookie();
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: sessionCookie
        ? {
            Cookie: sessionCookie,
          }
        : undefined,
      signal: options.signal,
    });
    return handleResponse<T>(response);
  },
};
