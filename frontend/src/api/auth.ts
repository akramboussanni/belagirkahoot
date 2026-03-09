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

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("/auth/verify-email", { token });
  return data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("/auth/forgot-password", { email });
  return data;
}

export async function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("/auth/reset-password", { token, new_password });
  return data;
}

