import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { mockAdapter, useMocks } from "@/mocks/adapter";
import { useAuthStore } from "@/store/useAuthStore";

// In dev, Vite proxies /api -> http://localhost:8000 (see vite.config.ts).
// In production, VITE_API_URL points straight at the deployed Django API.
// With VITE_USE_MOCKS (default on, no backend yet), requests are served by
// the mock adapter that implements the same DRF contract.
const baseURL = import.meta.env.VITE_API_URL ?? "/api";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

if (useMocks) {
  apiClient.defaults.adapter = mockAdapter;
}

// A bare instance for refresh calls — no auth header, no interceptors.
const refreshClient = axios.create({ baseURL });

// --- Auth token wiring -----------------------------------------------------

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setAccess, clearSession } = useAuthStore.getState();
  if (!refreshToken) throw new Error("no refresh token");
  try {
    const { data } = await refreshClient.post<{ access: string }>("/auth/token/refresh/", {
      refresh: refreshToken,
    });
    setAccess(data.access);
    return data.access;
  } catch (e) {
    clearSession();
    throw e;
  }
}

function isRetriable401(error: unknown): error is AxiosError {
  const err = error as AxiosError;
  const url = err.config?.url ?? "";
  // /auth/token/ (login) and /auth/token/refresh/ must surface 401s directly.
  return err.response?.status === 401 && !/\/auth\/token\/?(\/refresh\/?)?$/.test(url);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string }>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (isRetriable401(error) && original && !original._retried) {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      try {
        const token = await refreshPromise;
        original._retried = true;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);