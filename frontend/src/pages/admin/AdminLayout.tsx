import { Suspense } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useLogout } from "@/hooks/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", to: "/admin" },
  { label: "Orders", to: "/admin/orders" },
  { label: "Customers", to: "/admin/customers" },
  { label: "Products", to: "/admin/products" },
  { label: "Inventory", to: "/admin/inventory" },
  { label: "Collections", to: "/admin/collections" },
  { label: "Looks", to: "/admin/looks" },
  { label: "Discounts", to: "/admin/discounts" },
  { label: "Reviews", to: "/admin/reviews" },
  { label: "Settings", to: "/admin/settings" },
];

export function AdminLayout() {
  const logout = useLogout();

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-stone-200 md:flex">
        <Link to="/" className="border-b border-stone-200 px-6 py-5 font-display text-lg tracking-widest">
          STUDIO
          <span className="block text-[10px] font-sans uppercase tracking-widest text-stone-400">Admin</span>
        </Link>
        <nav className="flex flex-col gap-0.5 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-sm uppercase tracking-widest transition-colors",
                  isActive ? "bg-ink text-paper" : "text-stone-500 hover:text-ink"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-stone-200 p-3">
          <button
            onClick={() => logout.mutate(undefined)}
            className="w-full px-3 py-2 text-left text-sm uppercase tracking-widest text-stone-500 hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <nav className="sticky top-0 z-30 flex gap-1 overflow-x-auto border-b border-stone-200 bg-paper p-2 md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/admin"}
            className={({ isActive }) =>
              cn(
                "shrink-0 px-3 py-1.5 text-xs uppercase tracking-widest",
                isActive ? "bg-ink text-paper" : "text-stone-500"
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="min-w-0 flex-1 p-6 md:p-10">
        <Suspense fallback={<div className="flex h-48 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-ink" /></div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}