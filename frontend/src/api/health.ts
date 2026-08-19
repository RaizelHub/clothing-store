import { apiClient } from "./client";

export interface HealthResponse {
  status: "ok";
  service: string;
}

export async function getHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>("/health/");
  return data;
}
