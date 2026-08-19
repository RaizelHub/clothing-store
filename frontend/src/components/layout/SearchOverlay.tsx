import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/store/useUIStore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getProducts } from "@/api/products";
import { formatMoney } from "@/lib/format";

const TRENDING_SEARCHES = [
  "Silk Slips",
  "Merino Knitwear",
  "Tailored Overcoat",
  "Linen Trousers",
  "Alpaca Sweaters",
  "Capsule 01",
];

const QUICK_CATEGORIES = [
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Dresses & Slips", href: "/category/women-dresses" },
  { label: "Coats & Outerwear", href: "/category/men-outerwear" },
  { label: "Capsules", href: "/collections" },
];

export function SearchOverlay() {
  const isOpen = useUIStore((s) => s.isSearchOpen);
  const close = useUIStore((s) => s.closeSearch);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["products", { q: debouncedQuery, page: 1 }],
    queryFn: () => getProducts({ q: debouncedQuery, page: 1 }),
    enabled: debouncedQuery.trim().length > 1,
  });

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    close();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleSelectTrending = (term: string) => {
    setQuery(term);
  };

  const results = searchResults?.results ?? [];

  return (
    <div className="fixed inset-0 z-[55] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Search Catalogue">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-paper/95 backdrop-blur-md transition-opacity duration-300"
        onClick={close}
        aria-hidden
      />

      <div className="container-editorial relative min-h-screen pt-16 sm:pt-24 pb-20">
        {/* Search Input Bar */}
        <form onSubmit={submit} className="flex items-center gap-4 border-b border-stone-300 pb-5">
          <Search size={22} strokeWidth={1.5} className="text-ink/60" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search noble garments, fabrics, styles…"
            className="flex-1 bg-transparent font-display text-2xl text-ink placeholder:text-stone-400 focus:outline-none sm:text-4xl"
          />
          {isLoading && <Loader2 size={20} className="animate-spin text-stone-400" />}
          {query && (
            <button
              type="button"
              aria-label="Clear search query"
              onClick={() => setQuery("")}
              className="text-stone-400 hover:text-ink text-xs uppercase tracking-widest mr-2"
            >
              Clear
            </button>
          )}
          <button type="submit" aria-label="Submit search" className="text-ink/70 hover:text-ink">
            <ArrowRight size={22} strokeWidth={1.5} />
          </button>
          <button aria-label="Close search overlay" onClick={close} className="text-ink/70 hover:text-ink">
            <X size={22} strokeWidth={1.5} />
          </button>
        </form>

        {/* Dynamic Results vs Trending Suggestions */}
        {debouncedQuery.trim().length > 1 ? (
          <div className="mt-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-6">
              <span className="text-[11px] uppercase tracking-widest text-stone-500 font-medium">
                {isLoading ? "Searching atelier…" : `${searchResults?.count ?? 0} results for "${debouncedQuery}"`}
              </span>
              {results.length > 0 && (
                <button
                  onClick={submit}
                  className="text-[11px] uppercase tracking-widest text-ink font-medium hover:underline"
                >
                  View full results →
                </button>
              )}
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {results.slice(0, 6).map((product) => {
                  const image = product.images[0]?.image;
                  return (
                    <Link
                      key={product.id}
                      to={`/products/${product.slug}`}
                      onClick={close}
                      className="group flex flex-col bg-paper border border-stone-200/80 p-2 transition-all hover:border-stone-400"
                    >
                      <div className="aspect-[4/5] bg-stone-100 overflow-hidden mb-2">
                        {image && (
                          <img
                            src={image}
                            alt={product.name}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                      </div>
                      <h4 className="text-xs font-normal text-ink line-clamp-1 group-hover:text-stone-600">
                        {product.name}
                      </h4>
                      <span className="text-[11px] font-mono text-stone-500 mt-0.5">
                        {formatMoney(product.price_effective)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : !isLoading ? (
              <div className="py-12 text-center">
                <p className="font-display text-xl text-ink">No pieces found matching &ldquo;{debouncedQuery}&rdquo;</p>
                <p className="text-xs text-stone-500 mt-2">Try searching by category, silhouette, or noble fiber (e.g. Silk, Merino, Coat).</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {/* Trending searches */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-stone-400 font-medium mb-3">
                Trending Searches
              </p>
              <div className="flex flex-wrap gap-2">
                {TRENDING_SEARCHES.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleSelectTrending(term)}
                    className="border border-stone-200/90 bg-stone-100/50 px-3.5 py-1.5 text-xs text-ink transition-colors hover:border-stone-400 hover:bg-stone-200/60"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Categories */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-stone-400 font-medium mb-3">
                Jump to Category
              </p>
              <ul className="space-y-2 text-xs">
                {QUICK_CATEGORIES.map((cat) => (
                  <li key={cat.href}>
                    <Link
                      to={cat.href}
                      onClick={close}
                      className="text-stone-600 hover:text-ink transition-colors flex items-center justify-between py-1 border-b border-stone-100"
                    >
                      <span>{cat.label}</span>
                      <ArrowRight size={12} className="text-stone-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sourcing tip */}
            <div className="p-6 border border-stone-200/80 bg-stone-50/50 rounded">
              <span className="text-[10px] uppercase tracking-widest text-stone-500 font-mono block mb-1">
                Atelier Tip
              </span>
              <p className="text-xs text-stone-600 leading-relaxed">
                Filter by materials in our collection pages to browse items by Mulberry silk momme weight, merino micron gauge, or French linen wash.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}