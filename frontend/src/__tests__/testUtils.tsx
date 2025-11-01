import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Mock } from "vitest";

import { ApiClientContext } from "../app/contexts";
import type { ApiClient, RequestOptions } from "../services/api-client";

export function renderWithApi(
  ui: ReactElement,
  apiClient: ApiClient,
  route = "/app",
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ApiClientContext.Provider value={apiClient}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </ApiClientContext.Provider>
    </MemoryRouter>,
  );
}

export function createApiClientMock(overrides: Partial<ApiClient> = {}): ApiClient {
  const defaultGet: ApiClient["get"] = <T,>(path: string, _options?: RequestOptions) =>
    Promise.reject<T>(new Error(`Unexpected GET ${path}`));
  const defaultPost: ApiClient["post"] = <T,>(path: string, _body: unknown, _options?: RequestOptions) =>
    Promise.reject<T>(new Error(`Unexpected POST ${path}`));

  return {
    get: overrides.get ?? defaultGet,
    post: overrides.post ?? defaultPost,
  };
}

type ApiGetMock = Mock<ApiClient["get"]>;
type ApiPostMock = Mock<ApiClient["post"]>;

export function mockApiGet(fn: ApiGetMock): ApiClient["get"] {
  return function <T,>(path: string, options?: RequestOptions): Promise<T> {
    return fn(path, options) as Promise<T>;
  };
}

export function mockApiPost(fn: ApiPostMock): ApiClient["post"] {
  return function <T,>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return fn(path, body, options) as Promise<T>;
  };
}
