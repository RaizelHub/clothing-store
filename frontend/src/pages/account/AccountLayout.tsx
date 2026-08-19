import { useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck, User, Package, MapPin, Heart } from "lucide-react";
import { useLogout, useSession } from "@/hooks/auth";
import { Notice } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { resendVerification, verifyEmail } from "@/api/auth";
import { getApiErrorMessage } from "@/lib/errors";

const NAV = [
  { label: "Profile", to: "/account", icon: User },
  { label: "Order History", to: "/account/orders", icon: Package },
  { label: "Addresses", to: "/account/addresses", icon: MapPin },
  { label: "Saved Wishlist", to: "/wishlist", icon: Heart },
];

export function AccountLayout() {
  const { data: me, isLoading } = useSession();
  const logout = useLogout();
  const location = useLocation();
  const queryClient = useQueryClient();

  if (isLoading) return null;
  if (!me) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;

  const verified = (location.state as { verified?: boolean } | null)?.verified;

  return (
    <section className="container-editorial py-12 sm:py-16">
      <header className="mb-10 border-b border-stone-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
            Client Atelier
          </p>
          <h1 className="mt-1 font-display text-4xl sm:text-5xl text-ink">
            {me.first_name ? `${me.first_name} ${me.last_name || ""}` : "My Account"}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-600 font-mono">{me.email}</p>
        </div>
      </header>

      {!me.email_verified && (
        <div className="mb-8">
          <UnverifiedBanner
            email={me.email}
            onVerified={() => queryClient.invalidateQueries({ queryKey: ["auth", "me"] })}
          />
        </div>
      )}
      {verified && (
        <div className="mb-8">
          <Notice tone="success">Email address verified successfully.</Notice>
        </div>
      )}

      <div className="grid gap-10 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-wrap gap-2 md:flex-col md:gap-1.5 font-mono text-[11px]">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/account"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-4 py-2.5 uppercase tracking-widest transition-all duration-200 border",
                    isActive
                      ? "bg-ink text-paper border-ink font-medium"
                      : "bg-paper text-stone-600 border-stone-200 hover:border-stone-400 hover:text-ink"
                  )
                }
              >
                <Icon size={14} strokeWidth={1.5} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          {me.is_staff && (
            <NavLink
              to="/admin"
              className="flex items-center gap-2.5 px-4 py-2.5 uppercase tracking-widest text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-ink bg-paper"
            >
              <ShieldCheck size={14} strokeWidth={1.5} />
              <span>Studio Admin</span>
            </NavLink>
          )}
          <button
            onClick={() => logout.mutate(undefined)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-left uppercase tracking-widest text-stone-500 border border-transparent hover:text-accent transition-colors"
          >
            <LogOut size={14} strokeWidth={1.5} />
            <span>Sign out</span>
          </button>
        </nav>
        <div className="min-w-0 bg-paper border border-stone-200/80 p-6 sm:p-8">
          <Outlet />
        </div>
      </div>
    </section>
  );
}

function UnverifiedBanner({ email, onVerified }: { email: string; onVerified: () => void }) {
  const [state, setState] = useState<{ busy: boolean; demoToken?: string; error?: string }>({ busy: false });
  const resend = async () => {
    setState({ busy: true });
    try {
      const res = await resendVerification(email);
      setState({ busy: false, demoToken: res.demo_verification_token });
    } catch (e) {
      setState({ busy: false, error: getApiErrorMessage(e) });
    }
  };

  const verify = async () => {
    if (!state.demoToken) return;
    try {
      await verifyEmail(state.demoToken);
      onVerified();
    } catch (e) {
      setState({ ...state, error: getApiErrorMessage(e) });
    }
  };

  return (
    <Notice tone="info">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <span>Please verify <strong>{email}</strong> to unlock checkout.</span>
        <span className="flex items-center gap-3">
          <button onClick={resend} disabled={state.busy} className="uppercase tracking-widest underline underline-offset-2 disabled:opacity-50">
            {state.busy ? "Sending…" : "Resend Verification"}
          </button>
          {state.demoToken && (
            <button onClick={verify} className="uppercase tracking-widest underline underline-offset-2 text-ink font-medium">
              Open Demo Token Verification →
            </button>
          )}
        </span>
      </div>
      {state.error && <p className="mt-2 text-xs text-accent">{state.error}</p>}
    </Notice>
  );
}