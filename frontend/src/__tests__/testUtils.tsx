import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ApiClientContext } from "../app/contexts";
import type { ApiClient } from "../services/api-client";

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
  return {
    get: overrides.get ?? (async (path: string) => {
      throw new Error(`Unexpected GET ${path}`);
    }),
    post: overrides.post ?? (async (path: string) => {
      throw new Error(`Unexpected POST ${path}`);
    }),
  };
}
