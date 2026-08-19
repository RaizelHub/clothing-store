import { apiClient } from "./client";

export async function subscribeNewsletter(email: string): Promise<{ ok: boolean; message: string }> {
  const { data } = await apiClient.post<{ ok: boolean; message: string }>("/newsletter/", { email });
  return data;
}