import type { ReactNode } from "react";
import { Link, Outlet } from "react-router-dom";

export function AuthLayout({ children, footnote }: { children?: ReactNode; footnote?: ReactNode }) {
  return (
    <div className="container-editorial flex min-h-[85vh] flex-col items-center justify-center py-16">
      <div className="text-center mb-8">
        <Link to="/" className="inline-block font-display text-2xl tracking-[0.25em] uppercase text-ink">
          Studio Atelier
        </Link>
        <span className="block text-[9.5px] uppercase tracking-[0.3em] text-stone-400 font-mono mt-1">
          Client Portal
        </span>
      </div>

      <div className="w-full max-w-md border border-stone-200/90 bg-paper p-8 sm:p-10 shadow-sm">
        {children ?? <Outlet />}
      </div>

      {footnote && (
        <div className="mt-6 text-xs text-stone-500 font-mono tracking-wide text-center">
          {footnote}
        </div>
      )}
    </div>
  );
}