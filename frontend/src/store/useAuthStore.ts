import { create } from "zustand";
import { persist } from "zustand/middleware";

// Session tokens are client-storage meta-state (Zustand, persisted).
// The user object itself is server state and lives in TanStack Query
// (["auth","me"]) — never duplicate it here.

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (access: string, refresh: string) => void;
  setAccess: (access: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      setAccess: (access) => set({ accessToken: access }),
      clearSession: () => set({ accessToken: null, refreshToken: null }),
    }),
    { name: "studio_auth" }
  )
);