import { apiClient } from "./client";
import type { Host } from "../types";

export interface AuthResponse {
  token: string;
  host: Host;
}

export interface RegisterResponse {
  message: string;
}

export async function register(email: string, password: string): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>("/auth/register", { email, password });
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", { email, password });
  return data;
}
