import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Mock } from "vitest";

import { ApiClientContext, CurrentUserContext } from "../app/contexts";
import type { ApiClient, RequestOptions } from "../services/api-client";
import type { CurrentUserState } from "../app/hooks/use-current-user";

export function renderWithApi(
  ui: ReactElement,
  apiClient: ApiClient,
  route = "/app",
  currentUser?: CurrentUserState,
) {
  const userState: CurrentUserState =
    currentUser ?? {
      status: "ready",
      user: { email: "admin@example.com", roles: ["admin"], clientIds: [] },
      error: null,
      refresh: () => {
        // no-op for tests
      },
    };
  return render(
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ApiClientContext.Provider value={apiClient}>
        <CurrentUserContext.Provider value={userState}>
          <Routes>
            <Route path="*" element={ui} />
          </Routes>
        </CurrentUserContext.Provider>
      </ApiClientContext.Provider>
    </MemoryRouter>,
  );
}

export function createApiClientMock(overrides: Partial<ApiClient> = {}): ApiClient {
  const defaultGet: ApiClient["get"] = <T,>(path: string, _options?: RequestOptions) =>
    Promise.reject<T>(new Error(`Unexpected GET ${path}`));
  const defaultPost: ApiClient["post"] = <T,>(path: string, _body: unknown, _options?: RequestOptions) =>
    Promise.reject<T>(new Error(`Unexpected POST ${path}`));
  const defaultPut: ApiClient["put"] = <T,>(path: string, _body: unknown, _options?: RequestOptions) =>
    Promise.reject<T>(new Error(`Unexpected PUT ${path}`));
  const defaultDelete: ApiClient["delete"] = <T,>(path: string, _options?: RequestOptions) =>
    Promise.reject<T>(new Error(`Unexpected DELETE ${path}`));

  return {
    get: overrides.get ?? defaultGet,
    post: overrides.post ?? defaultPost,
    put: overrides.put ?? defaultPut,
    delete: overrides.delete ?? defaultDelete,
  };
}

type ApiGetMock = Mock<ApiClient["get"]>;
type ApiPostMock = Mock<ApiClient["post"]>;
type ApiPutMock = Mock<ApiClient["put"]>;
type ApiDeleteMock = Mock<ApiClient["delete"]>;

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

export function mockApiPut(fn: ApiPutMock): ApiClient["put"] {
  return function <T,>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return fn(path, body, options) as Promise<T>;
  };
}

export function mockApiDelete(fn: ApiDeleteMock): ApiClient["delete"] {
  return function <T,>(path: string, options?: RequestOptions): Promise<T> {
    return fn(path, options) as Promise<T>;
  };
}


