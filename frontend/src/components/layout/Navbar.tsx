import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Search, User, Heart, ShoppingBag } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useSession } from "@/hooks/auth";
import { cn } from "@/lib/utils";

const PRIMARY_LINKS = [
  { label: "New Arrivals", href: "/new" },
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Collections", href: "/collections" },
];

function BagButton({ open }: { open: () => void }) {
  const { data: cart } = useCart();
  const count = cart?.item_count ?? 0;
  return (
    <button
      aria-label={`Shopping bag, ${count} item${count === 1 ? "" : "s"}`}
      onClick={open}
      className="group relative flex size-9 items-center justify-center rounded-full transition-all duration-300 hover:bg-stone-200/60 text-ink"
    >
      <ShoppingBag size={18} strokeWidth={1.5} className="transition-transform duration-300 group-hover:scale-105" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-ink text-[9px] font-medium leading-none text-paper animate-fade-in shadow-sm">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

export function Navbar() {
  const location = useLocation();
  const openMobileNav = useUIStore((s) => s.openMobileNav);
  const openCartDrawer = useUIStore((s) => s.openCartDrawer);
  const openSearch = useUIStore((s) => s.openSearch);
  const { data: me } = useSession();
  const { data: wishlist = [] } = useWishlist();

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full transition-all duration-300">
      {/* Top Editorial Announcement Bar */}
      <div className="bg-ink py-2 px-4 text-[10px] uppercase tracking-widest text-paper/80 transition-colors">
        <div className="container-editorial flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-2 text-paper/60">
            <span>Autumn / Winter Capsule 01</span>
          </div>
          <div className="mx-auto sm:mx-0 flex items-center gap-4">
            <span className="font-medium text-paper tracking-wider">Complimentary express shipping on orders over $150</span>
          </div>
          <div className="hidden md:flex items-center gap-3 text-paper/60">
            <span>Worldwide Atelier Delivery</span>
          </div>
        </div>
      </div>


      {/* Main Navigation Bar */}
      <div
        className={cn(
          "transition-all duration-400 ease-editorial border-b",
          isScrolled
            ? "bg-paper/95 backdrop-blur-md border-stone-200/90 shadow-subtle py-3.5"
            : "bg-paper/80 backdrop-blur-sm border-stone-200/50 py-5"
        )}
      >
        <div className="container-editorial hidden items-center justify-between md:flex">
          {/* Left: Navigation links */}
          <nav className="flex flex-1 items-center gap-8">
            {PRIMARY_LINKS.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "nav-link text-[11px] uppercase tracking-widest transition-colors",
                    isActive ? "nav-link-active" : "text-stone-700 hover:text-ink"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Center: Atelier Brand Lockup */}
          <Link
            to="/"
            className="group flex flex-col items-center justify-center text-center transition-transform duration-300 hover:opacity-90"
            aria-label="Studio Atelier home"
          >
            <span className="font-display text-2xl font-normal tracking-[0.25em] text-ink">
              STUDIO
            </span>
            <span className="text-[8.5px] uppercase tracking-[0.35em] text-stone-400 -mt-1 font-sans">
              Atelier
            </span>
          </Link>

          {/* Right: Quick actions */}
          <div className="flex flex-1 items-center justify-end gap-2.5 sm:gap-3">
            {/* Search Trigger */}
            <button
              aria-label="Search"
              onClick={openSearch}
              className="flex items-center gap-2 rounded-full border border-stone-200/80 bg-stone-100/60 px-3.5 py-1.5 text-xs text-stone-600 transition-all duration-300 hover:border-stone-400 hover:bg-stone-100 hover:text-ink"
            >
              <Search size={14} strokeWidth={1.5} />
              <span className="hidden lg:inline text-[10.5px] uppercase tracking-wider text-stone-600">Search</span>
              <kbd className="hidden lg:inline rounded bg-stone-200/80 px-1.5 py-0.5 text-[9px] font-mono text-stone-600">
                ⌘K
              </kbd>
            </button>

            {/* Account Link */}
            <Link
              to={me ? "/account" : "/login"}
              aria-label={me ? "Customer account" : "Sign in"}
              className="group flex items-center gap-2 rounded-full p-2 text-ink/80 transition-colors hover:bg-stone-200/50 hover:text-ink"
            >
              <div className="flex size-7 items-center justify-center rounded-full bg-stone-200/80 text-[11px] font-medium text-stone-800 transition-colors group-hover:bg-ink group-hover:text-paper">
                {me ? (
                  me.first_name ? me.first_name[0].toUpperCase() : <User size={13} strokeWidth={1.5} />
                ) : (
                  <User size={13} strokeWidth={1.5} />
                )}
              </div>
              {me && (
                <span className="hidden xl:inline text-xs font-medium text-ink">
                  {me.first_name || me.email.split("@")[0]}
                </span>
              )}
            </Link>

            {/* Wishlist Link */}
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="relative flex size-9 items-center justify-center rounded-full text-ink/80 transition-colors hover:bg-stone-200/50 hover:text-ink"
            >
              <Heart size={18} strokeWidth={1.5} />
              {wishlist.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-medium leading-none text-white shadow-sm animate-fade-in">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Bag Trigger */}
            <BagButton open={openCartDrawer} />
          </div>
        </div>

        {/* Mobile Header Bar */}
        <div className="container-editorial flex items-center justify-between md:hidden">
          <button
            aria-label="Open menu"
            onClick={openMobileNav}
            className="flex size-9 items-center justify-center rounded-full text-ink hover:bg-stone-200/50"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>

          <Link to="/" className="flex flex-col items-center justify-center text-center">
            <span className="font-display text-xl font-normal tracking-[0.25em] text-ink">
              STUDIO
            </span>
            <span className="text-[7.5px] uppercase tracking-[0.3em] text-stone-400 -mt-1 font-sans">
              Atelier
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <button
              aria-label="Search catalogue"
              onClick={openSearch}
              className="flex size-9 items-center justify-center rounded-full text-ink hover:bg-stone-200/50"
            >
              <Search size={18} strokeWidth={1.5} />
            </button>
            <BagButton open={openCartDrawer} />
          </div>
        </div>
      </div>
    </header>
  );
}