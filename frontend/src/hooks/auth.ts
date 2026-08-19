import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, login as loginRequest, logout as logoutRequest, register as registerRequest, type RegisterPayload } from "@/api/auth";
import { useAuthStore } from "@/store/useAuthStore";

// Session = server state (TanStack Query). Tokens = client storage (Zustand).
// A "session" only exists while we hold tokens; the user record comes from /auth/me/.

export function useSession() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    enabled: Boolean(accessToken),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => loginRequest(email, password),
    onSuccess: (tokens) => {
      useAuthStore.getState().setTokens(tokens.access, tokens.refresh);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerRequest(payload),
    onSuccess: (result) => {
      useAuthStore.getState().setTokens(result.access, result.refresh);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          await logoutRequest(refreshToken);
        } catch {
          // local signout regardless
        }
      }
    },
    onSuccess: () => {
      useAuthStore.getState().clearSession();
      queryClient.clear();
    },
  });
}