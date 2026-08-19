import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="container-editorial flex min-h-[60vh] items-center justify-center">
        <p className="text-sm uppercase tracking-widest text-stone-400">Checking session…</p>
      </div>
    );
  }
  if (!me) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useSession();
  if (isLoading) return null;
  if (me) return <Navigate to="/account" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm uppercase tracking-widest text-stone-400">Checking access…</p>
      </div>
    );
  }
  if (!me) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (!me.is_staff) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}