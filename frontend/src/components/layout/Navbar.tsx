import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Menu,
  Search,
  User,
  Heart,
  ShoppingBag,
  ArrowUpRight,
} from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useSession } from "@/hooks/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "New arrivals", href: "/new" },
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Collections", href: "/collections" },
  { label: "Shop the Look", href: "/looks" },
];

export function Navbar() {
  const openMenu = useUIStore((s) => s.openMobileNav);
  const openBag = useUIStore((s) => s.openCartDrawer);
  const openSearch = useUIStore((s) => s.openSearch);
  const { data: cart } = useCart();
  const { data: wishlist = [] } = useWishlist();
  const { data: me } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const count = cart?.item_count ?? 0;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("studio-header", scrolled && "is-scrolled")}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="studio-announcement">
        <span>Good things, just in.</span>
        <Link to="/new">
          Meet your new favorites <ArrowUpRight size={12} />
        </Link>
      </div>
      <div className="container-editorial studio-nav">
        <button
          className="nav-icon mobile-menu-button"
          onClick={openMenu}
          aria-label="Open menu"
        >
          <Menu size={22} strokeWidth={1.5} />
        </button>
        <Link to="/" className="studio-wordmark" aria-label="Studio home">
          studio<span>®</span>
        </Link>
        <nav className="studio-primary-nav" aria-label="Main navigation">
          {LINKS.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) =>
                cn("studio-nav-link", isActive && "is-active")
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="studio-nav-actions">
          <button onClick={openSearch} className="nav-icon" aria-label="Search">
            <Search size={20} strokeWidth={1.5} />
          </button>
          <Link
            to={me ? "/account" : "/login"}
            className="nav-icon nav-account"
            aria-label={me ? "Customer account" : "Sign in"}
          >
            <User size={20} strokeWidth={1.5} />
          </Link>
          <Link
            to="/wishlist"
            className="nav-icon nav-wishlist"
            aria-label={`Wishlist, ${wishlist.length} items`}
          >
            <Heart size={20} strokeWidth={1.5} />
            {wishlist.length > 0 && <span className="wishlist-dot" />}
          </Link>
          <button
            onClick={openBag}
            className="studio-bag-button"
            aria-label={`Shopping bag, ${count} item${count === 1 ? "" : "s"}`}
          >
            <ShoppingBag size={18} strokeWidth={1.5} />
            <span className="bag-label">Bag</span>
            <span key={count} className="bag-count">
              {count}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
