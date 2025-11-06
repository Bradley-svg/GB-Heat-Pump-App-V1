import type { ApiClient } from "./api-client";

export interface SignupPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ResetPayload {
  token: string;
  password: string;
}

export interface AuthUser {
  email: string;
  roles: string[];
  clientIds?: string[];
  firstName?: string | null;
  lastName?: string | null;
  sessionExpiresAt?: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface SignupResponse {
  user: AuthUser;
}

export async function signup(api: ApiClient, payload: SignupPayload): Promise<SignupResponse> {
  return api.post<SignupResponse>("/api/auth/signup", payload);
}

export async function login(api: ApiClient, payload: LoginPayload): Promise<LoginResponse> {
  return api.post<LoginResponse>("/api/auth/login", payload);
}

export async function logout(api: ApiClient): Promise<void> {
  await api.post("/api/auth/logout", {});
}

export async function recover(api: ApiClient, email: string): Promise<void> {
  await api.post("/api/auth/recover", { email });
}

export async function resetPassword(api: ApiClient, payload: ResetPayload): Promise<void> {
  await api.post("/api/auth/reset", payload);
}
