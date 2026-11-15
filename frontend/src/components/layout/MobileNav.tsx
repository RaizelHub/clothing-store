import { Link, useNavigate } from "react-router-dom";
import { User, Heart, LogOut } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { Drawer } from "@/components/ui/Drawer";
import { useLogout, useSession } from "@/hooks/auth";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";

const NAVIGATION_ITEMS = [
  { label: "New Arrivals", href: "/new", note: "Just landed" },
  { label: "Women's Collection", href: "/women", note: "Find your favorites" },
  { label: "Men's Collection", href: "/men", note: "Tailored essentials" },
  { label: "Collections", href: "/collections", note: "Seasonal edits" },
];

export function MobileNav() {
  const isOpen = useUIStore((s) => s.isMobileNavOpen);
  const close = useUIStore((s) => s.closeMobileNav);
  const { data: me } = useSession();
  const { data: wishlist = [] } = useWishlist();
  const { data: cart } = useCart();
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogout = () => {
    close();
    logout.mutate(undefined, { onSuccess: () => navigate("/") });
  };

  return (
    <Drawer open={isOpen} onClose={close} title="Explore Studio" side="left">
      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium mb-4">
            Catalogue
          </p>
          <nav className="flex flex-col space-y-1">
            {NAVIGATION_ITEMS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={close}
                className="group flex items-center justify-between py-3 border-b border-stone-100/80 text-ink transition-colors hover:text-stone-600"
              >
                <span className="font-display text-xl font-normal">
                  {item.label}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-stone-400 group-hover:translate-x-0.5 transition-transform">
                  {item.note}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Quick Actions Card */}
        <div className="rounded border border-stone-200/80 bg-stone-100/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Link
              to="/wishlist"
              onClick={close}
              className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink font-medium hover:text-stone-600"
            >
              <Heart size={15} strokeWidth={1.5} />
              <span>Wishlist</span>
              {wishlist.length > 0 && (
                <span className="rounded-full bg-accent px-1.5 py-0.2 text-[9px] text-white">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <div className="text-[11px] text-stone-400">
              {cart?.item_count ?? 0}{" "}
              {cart?.item_count === 1 ? "item" : "items"} in Bag
            </div>
          </div>
        </div>
      </div>

      {/* Footer info & Account */}
      <div className="border-t border-stone-200/80 bg-stone-50/50 p-6 space-y-4 text-xs">
        {me ? (
          <div className="space-y-2.5">
            <div className="text-stone-500 text-[11px]">
              Signed in as{" "}
              <span className="font-medium text-ink">{me.email}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/account"
                onClick={close}
                className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-ink font-medium hover:underline"
              >
                <User size={13} strokeWidth={1.5} />
                Account
              </Link>
              {me.is_staff && (
                <Link
                  to="/admin"
                  onClick={close}
                  className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-stone-500 hover:text-ink"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-stone-400 hover:text-accent ml-auto"
              >
                <LogOut size={13} strokeWidth={1.5} />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Link
              to="/login"
              onClick={close}
              className="flex items-center gap-2 uppercase tracking-widest text-[11px] font-medium text-ink hover:text-stone-600"
            >
              <User size={14} strokeWidth={1.5} />
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={close}
              className="text-[11px] text-stone-500 uppercase tracking-widest hover:text-ink"
            >
              Create Account
            </Link>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between text-[10px] text-stone-400 uppercase tracking-widest">
          <span>Currency: PHP (₱)</span>
          <span>Studio Atelier</span>
        </div>
      </div>
    </Drawer>
  );
}
