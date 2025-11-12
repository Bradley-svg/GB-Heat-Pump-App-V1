import { apiClient } from "./api-client";
import type { AuthUser } from "./auth-service";

export async function fetchCurrentUser(): Promise<AuthUser> {
  return apiClient.get<AuthUser>("/api/me");
}
