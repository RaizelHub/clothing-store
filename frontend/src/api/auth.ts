import { apiClient } from "./client";
import type { Address, AuthTokens, User } from "@/types/api";

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface RegisterResult extends AuthTokens {
  user: User;
  demo_verification_token?: string;
}

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  const { data } = await apiClient.post<RegisterResult>("/auth/register/", payload);
  return data;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>("/auth/token/", { email, password });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post("/auth/logout/", { refresh: refreshToken });
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me/");
  return data;
}

export interface ProfileUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export async function updateProfile(payload: ProfileUpdate): Promise<User> {
  const { data } = await apiClient.patch<User>("/auth/profile/", payload);
  return data;
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await apiClient.post("/auth/password/change/", { current_password, new_password });
}

export interface ResetRequestResult {
  detail: string;
  demo_reset_token?: string;
  demo_email?: string;
}

export async function requestPasswordReset(email: string): Promise<ResetRequestResult> {
  const { data } = await apiClient.post<ResetRequestResult>("/auth/password/reset/", { email });
  return data;
}

export async function confirmPasswordReset(token: string, new_password: string): Promise<void> {
  await apiClient.post("/auth/password/reset/confirm/", { token, new_password });
}

export async function verifyEmail(token: string): Promise<void> {
  await apiClient.post("/auth/email/verify/", { token });
}

export async function resendVerification(email: string): Promise<{ demo_verification_token?: string; demo_email?: string }> {
  const { data } = await apiClient.post<{ demo_verification_token?: string; demo_email?: string }>("/auth/email/resend/", {
    email,
  });
  return data;
}

// --- Addresses -------------------------------------------------------------

export async function getAddresses(): Promise<Address[]> {
  const { data } = await apiClient.get<Address[]>("/addresses/");
  return data;
}

export async function createAddress(payload: Omit<Address, "id">): Promise<Address> {
  const { data } = await apiClient.post<Address>("/addresses/", payload);
  return data;
}

export async function updateAddress(id: number, payload: Partial<Address>): Promise<Address> {
  const { data } = await apiClient.patch<Address>(`/addresses/${id}/`, payload);
  return data;
}

export async function deleteAddress(id: number): Promise<void> {
  await apiClient.delete(`/addresses/${id}/`);
}